from asyncio import sleep

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audits.jobs import process_audit_run
from app.audits.schemas import AuditCreate, AuditResultResponse, AuditRunResponse
from app.audits.service import create_pending_audit_run, execute_audit_run, validate_audit_payload
from app.auth.dependencies import get_current_user
from app.core.database import SessionLocal, get_db
from app.core.queue import get_audit_queue
from app.core.models import AuditResult, AuditRun, Criterion, User

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
        job = queue.enqueue(process_audit_run, audit_run.id, job_timeout=600, result_ttl=3600)
        audit_run.queue_job_id = job.id
    except Exception:
        execute_audit_run(db, audit_run, ifc_file, criteria)
    db.commit()
    db.refresh(audit_run)
    return audit_run


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
