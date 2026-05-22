from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audits.engine import EvaluatedCriterion, evaluate_criteria
from app.audits.schemas import AuditCreate, AuditResultResponse, AuditRunResponse
from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.models import AuditResult, AuditRun, CriteriaSet, Criterion, IfcFile, Project, User
from rules_engine.scoring import calculate_score

router = APIRouter(prefix="/audits", tags=["audits"], dependencies=[Depends(get_current_user)])


@router.post("", response_model=AuditRunResponse, status_code=status.HTTP_201_CREATED)
def create_audit(
    payload: AuditCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AuditRun:
    project = db.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    ifc_file = db.get(IfcFile, payload.ifc_file_id)
    if ifc_file is None or ifc_file.project_id != payload.project_id:
        raise HTTPException(status_code=404, detail="IFC file not found for project.")

    if not Path(ifc_file.file_path).exists():
        raise HTTPException(status_code=404, detail="Stored IFC file not found.")

    criteria_set = db.get(CriteriaSet, payload.criteria_set_id)
    if criteria_set is None:
        raise HTTPException(status_code=404, detail="Criteria set not found.")

    criteria = list(
        db.scalars(
            select(Criterion)
            .where(Criterion.criteria_set_id == payload.criteria_set_id, Criterion.active.is_(True))
            .order_by(Criterion.created_at.asc())
        )
    )
    if not criteria:
        raise HTTPException(status_code=400, detail="Criteria set has no active criteria.")

    started_at = datetime.utcnow()
    evaluated_bundle = evaluate_criteria(ifc_file, criteria)
    score = calculate_score(
        [{"severity": item.severity, "status": item.status} for item in evaluated_bundle.summary_results]
    )

    audit_run = AuditRun(
        project_id=payload.project_id,
        ifc_file_id=payload.ifc_file_id,
        criteria_set_id=payload.criteria_set_id,
        status="completed",
        score_percent=score.score_percent,
        score_low=score.by_severity.get("baixa"),
        score_moderate=score.by_severity.get("moderada"),
        score_high=score.by_severity.get("alta"),
        total_criteria=score.total_criteria,
        approved_criteria=score.approved_criteria,
        failed_criteria=score.failed_criteria,
        started_at=started_at,
        finished_at=datetime.utcnow(),
        created_by=current_user.id,
    )
    db.add(audit_run)
    db.flush()

    for evaluated in evaluated_bundle.detailed_results:
        db.add(to_audit_result(audit_run.id, evaluated))

    db.commit()
    db.refresh(audit_run)
    return audit_run


@router.get("/{audit_id}", response_model=AuditRunResponse)
def get_audit(audit_id: str, db: Session = Depends(get_db)) -> AuditRun:
    audit_run = db.get(AuditRun, audit_id)
    if audit_run is None:
        raise HTTPException(status_code=404, detail="Audit not found.")
    return audit_run


@router.get("/{audit_id}/status")
def get_audit_status(audit_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    audit_run = db.get(AuditRun, audit_id)
    if audit_run is None:
        raise HTTPException(status_code=404, detail="Audit not found.")
    return {"id": audit_id, "status": audit_run.status}


@router.get("/{audit_id}/summary")
def get_audit_summary(audit_id: str, db: Session = Depends(get_db)) -> dict:
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
    }


@router.get("/{audit_id}/results", response_model=list[AuditResultResponse])
def get_audit_results(audit_id: str, db: Session = Depends(get_db)) -> list[AuditResultResponse]:
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


def to_audit_result(audit_run_id: str, evaluated: EvaluatedCriterion) -> AuditResult:
    return AuditResult(
        audit_run_id=audit_run_id,
        criteria_id=evaluated.criteria_id,
        element_guid=evaluated.element_guid,
        element_type=evaluated.element_type,
        element_name=evaluated.element_name,
        status=evaluated.status,
        severity=evaluated.severity,
        message=evaluated.message,
        actual_value=evaluated.actual_value,
        expected_value=evaluated.expected_value,
        weight=evaluated.weight,
        score_value=evaluated.score_value,
        fix_suggestion=evaluated.fix_suggestion,
        is_summary=evaluated.is_summary,
    )
