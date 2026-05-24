from asyncio import sleep
from datetime import datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from redis.exceptions import RedisError
from rq import Retry
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audits.jobs import process_audit_run
from app.audits.schemas import (
    AuditComparisonResponse,
    AuditCreate,
    AuditFailureItem,
    AuditHistoryItem,
    AuditResultResponse,
    AuditRunResponse,
    SnapshotCreate,
    SnapshotResponse,
)
from app.audits.service import create_pending_audit_run, execute_audit_run, mark_audit_run_failed, validate_audit_payload
from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.core.queue import get_audit_queue
from app.core.models import AuditResult, AuditRun, AuditSnapshot, CriteriaSet, Criterion, IfcFile, Project, User

router = APIRouter(prefix="/audits", tags=["audits"])


@router.post("", response_model=AuditRunResponse, status_code=status.HTTP_201_CREATED)
def create_audit(
    payload: AuditCreate,
    mode: str = Query(default="async", pattern="^(async|sync)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditRun:
    _, ifc_file, _, criteria = validate_audit_payload(
        db=db,
        project_id=payload.project_id,
        ifc_file_id=payload.ifc_file_id,
        criteria_set_id=payload.criteria_set_id,
    )

    audit_run = create_pending_audit_run(
        db=db,
        project_id=payload.project_id,
        ifc_file_id=payload.ifc_file_id,
        criteria_set_id=payload.criteria_set_id,
        created_by=current_user.id,
    )

    if mode == "sync":
        execute_audit_run(db, audit_run, ifc_file, criteria)
        db.commit()
        db.refresh(audit_run)
        return audit_run

    try:
        queue = get_audit_queue()
        retry = None
        if settings.audit_job_max_retries > 0:
            retry = Retry(
                max=settings.audit_job_max_retries,
                interval=settings.audit_job_retry_intervals_seconds,
            )
        job = queue.enqueue(
            process_audit_run,
            audit_run.id,
            job_timeout=settings.audit_job_timeout_seconds,
            result_ttl=settings.audit_job_result_ttl_seconds,
            failure_ttl=settings.audit_job_failure_ttl_seconds,
            retry=retry,
        )
        audit_run.queue_job_id = job.id
    except (RedisError, Exception) as exc:
        mark_audit_run_failed(db, audit_run.id, f"Audit queue unavailable: {exc}")
        db.commit()
        raise HTTPException(
            status_code=503,
            detail={
                "message": "Audit queue unavailable. Async audits require Redis/RQ worker availability.",
                "audit_id": audit_run.id,
                "status": audit_run.status,
            },
        ) from exc
    db.commit()
    db.refresh(audit_run)
    return audit_run


@router.get("/project/{project_id}/history", response_model=list[AuditHistoryItem])
def list_project_audit_history(
    project_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[AuditHistoryItem]:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    snapshot_counts = dict(
        db.execute(
            select(AuditSnapshot.audit_run_id, func.count(AuditSnapshot.id))
            .where(AuditSnapshot.revoked_at.is_(None), AuditSnapshot.expires_at > datetime.utcnow())
            .group_by(AuditSnapshot.audit_run_id)
        ).all()
    )
    rows = db.execute(
        select(AuditRun, Project.name, IfcFile.file_name, CriteriaSet.name)
        .join(Project, Project.id == AuditRun.project_id)
        .join(IfcFile, IfcFile.id == AuditRun.ifc_file_id)
        .join(CriteriaSet, CriteriaSet.id == AuditRun.criteria_set_id)
        .where(AuditRun.project_id == project_id)
        .order_by(AuditRun.finished_at.desc().nullslast(), AuditRun.started_at.desc().nullslast())
    ).all()

    return [
        AuditHistoryItem(
            **AuditRunResponse.model_validate(audit_run).model_dump(),
            project_name=project_name,
            ifc_file_name=ifc_file_name,
            criteria_set_name=criteria_set_name,
            snapshot_count=int(snapshot_counts.get(audit_run.id, 0)),
        )
        for audit_run, project_name, ifc_file_name, criteria_set_name in rows
    ]


@router.get("/compare", response_model=AuditComparisonResponse)
def compare_audit_runs(
    base_audit_id: str = Query(),
    target_audit_id: str = Query(),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AuditComparisonResponse:
    base_audit = db.get(AuditRun, base_audit_id)
    target_audit = db.get(AuditRun, target_audit_id)
    if base_audit is None or target_audit is None:
        raise HTTPException(status_code=404, detail="Audit not found.")
    if base_audit.project_id != target_audit.project_id:
        raise HTTPException(status_code=400, detail="Audits must belong to the same project.")

    base_failures = failed_result_map(db, base_audit_id)
    target_failures = failed_result_map(db, target_audit_id)
    base_keys = set(base_failures)
    target_keys = set(target_failures)

    return AuditComparisonResponse(
        base_audit_id=base_audit_id,
        target_audit_id=target_audit_id,
        score_delta=round((target_audit.score_percent or 0) - (base_audit.score_percent or 0), 2),
        new_failures=[target_failures[key] for key in sorted(target_keys - base_keys)],
        resolved_failures=[base_failures[key] for key in sorted(base_keys - target_keys)],
        persistent_failures=[target_failures[key] for key in sorted(target_keys & base_keys)],
    )


@router.post("/{audit_id}/snapshots", response_model=SnapshotResponse, status_code=status.HTTP_201_CREATED)
def create_audit_snapshot(
    audit_id: str,
    payload: SnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SnapshotResponse:
    if payload.expires_in_days < 1 or payload.expires_in_days > 90:
        raise HTTPException(status_code=400, detail="Snapshot expiration must be between 1 and 90 days.")

    audit_run = db.get(AuditRun, audit_id)
    if audit_run is None:
        raise HTTPException(status_code=404, detail="Audit not found.")
    if audit_run.status != "completed":
        raise HTTPException(status_code=400, detail="Only completed audits can be shared as snapshots.")

    token = token_urlsafe(32)
    snapshot = AuditSnapshot(
        audit_run_id=audit_id,
        token_hash=hash_snapshot_token(token),
        created_by=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=payload.expires_in_days),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    return SnapshotResponse(
        id=snapshot.id,
        audit_run_id=audit_id,
        token=token,
        view_url=f"/snapshots/{token}",
        report_html_url=f"/snapshots/{token}/report/html",
        expires_at=snapshot.expires_at,
    )


@router.get("/{audit_id}", response_model=AuditRunResponse)
def get_audit(
    audit_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AuditRun:
    audit_run = db.get(AuditRun, audit_id)
    if audit_run is None:
        raise HTTPException(status_code=404, detail="Audit not found.")
    return audit_run


@router.get("/{audit_id}/status")
def get_audit_status(
    audit_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict[str, str]:
    audit_run = db.get(AuditRun, audit_id)
    if audit_run is None:
        raise HTTPException(status_code=404, detail="Audit not found.")
    return {
        "id": audit_id,
        "status": audit_run.status,
        "queue_job_id": audit_run.queue_job_id or "",
        "error_message": audit_run.error_message or "",
    }


@router.get("/{audit_id}/summary")
def get_audit_summary(
    audit_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    audit_run = db.get(AuditRun, audit_id)
    if audit_run is None:
        raise HTTPException(status_code=404, detail="Audit not found.")
    return {
        "id": audit_id,
        "score_percent": audit_run.score_percent,
        "score_low": audit_run.score_low,
        "score_moderate": audit_run.score_moderate,
        "score_high": audit_run.score_high,
        "total_criteria": audit_run.total_criteria,
        "approved_criteria": audit_run.approved_criteria,
        "failed_criteria": audit_run.failed_criteria,
        "status": audit_run.status,
        "queue_job_id": audit_run.queue_job_id,
        "error_message": audit_run.error_message,
    }


@router.get("/{audit_id}/results", response_model=list[AuditResultResponse])
def get_audit_results(
    audit_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[AuditResultResponse]:
    audit_run = db.get(AuditRun, audit_id)
    if audit_run is None:
        raise HTTPException(status_code=404, detail="Audit not found.")

    rows = db.execute(
        select(AuditResult, Criterion.code)
        .join(Criterion, Criterion.id == AuditResult.criteria_id)
        .where(AuditResult.audit_run_id == audit_id)
        .order_by(AuditResult.created_at.asc())
    ).all()

    return [
        AuditResultResponse(
            criteria_id=audit_result.criteria_id,
            code=code,
            status=audit_result.status,
            severity=audit_result.severity,
            message=audit_result.message or "",
            actual_value=audit_result.actual_value,
            expected_value=audit_result.expected_value,
            element_guid=audit_result.element_guid,
            element_type=audit_result.element_type,
            element_name=audit_result.element_name,
            weight=audit_result.weight,
            score_value=audit_result.score_value,
            fix_suggestion=audit_result.fix_suggestion,
            is_summary=audit_result.is_summary,
        )
        for audit_result, code in rows
    ]


@router.websocket("/{audit_id}/ws")
async def audit_status_websocket(websocket: WebSocket, audit_id: str) -> None:
    await websocket.accept()
    try:
        while True:
            db = SessionLocal()
            try:
                audit_run = db.get(AuditRun, audit_id)
            finally:
                db.close()
            if audit_run is None:
                await websocket.send_json({"id": audit_id, "status": "not_found"})
                await websocket.close(code=1008)
                return

            await websocket.send_json(
                {
                    "id": audit_id,
                    "status": audit_run.status,
                    "score_percent": audit_run.score_percent,
                    "approved_criteria": audit_run.approved_criteria,
                    "failed_criteria": audit_run.failed_criteria,
                    "error_message": audit_run.error_message,
                }
            )

            if audit_run.status in {"completed", "failed"}:
                await websocket.close(code=1000)
                return

            await sleep(1)
    except WebSocketDisconnect:
        return


def hash_snapshot_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def failed_result_map(db: Session, audit_id: str) -> dict[tuple[str, str], AuditFailureItem]:
    rows = db.execute(
        select(AuditResult, Criterion.code)
        .join(Criterion, Criterion.id == AuditResult.criteria_id)
        .where(
            AuditResult.audit_run_id == audit_id,
            AuditResult.status == "failed",
            AuditResult.is_summary.is_(False),
        )
        .order_by(Criterion.code.asc(), AuditResult.element_guid.asc())
    ).all()
    failures: dict[tuple[str, str], AuditFailureItem] = {}
    for result, code in rows:
        element_key = result.element_guid or result.element_name or "sem-elemento"
        failures[(code, element_key)] = AuditFailureItem(
            code=code,
            element_guid=result.element_guid,
            element_name=result.element_name,
            severity=result.severity,
            message=result.message or "",
            fix_suggestion=result.fix_suggestion,
        )
    return failures
