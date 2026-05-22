from datetime import datetime
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.audits.engine import AuditEvaluationBundle, EvaluatedCriterion, evaluate_criteria
from app.core.models import AuditResult, AuditRun, CriteriaSet, Criterion, IfcFile, Project
from rules_engine.scoring import calculate_score


def validate_audit_payload(
    db: Session,
    project_id: str,
    ifc_file_id: str,
    criteria_set_id: str,
) -> tuple[Project, IfcFile, CriteriaSet, list[Criterion]]:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None or ifc_file.project_id != project_id:
        raise HTTPException(status_code=404, detail="IFC file not found for project.")

    if not Path(ifc_file.file_path).exists():
        raise HTTPException(status_code=404, detail="Stored IFC file not found.")

    criteria_set = db.get(CriteriaSet, criteria_set_id)
    if criteria_set is None:
        raise HTTPException(status_code=404, detail="Criteria set not found.")

    criteria = list(
        db.scalars(
            select(Criterion)
            .where(Criterion.criteria_set_id == criteria_set_id, Criterion.active.is_(True))
            .order_by(Criterion.created_at.asc())
        )
    )
    if not criteria:
        raise HTTPException(status_code=400, detail="Criteria set has no active criteria.")
    return project, ifc_file, criteria_set, criteria


def create_pending_audit_run(
    db: Session,
    *,
    project_id: str,
    ifc_file_id: str,
    criteria_set_id: str,
    created_by: str | None,
) -> AuditRun:
    audit_run = AuditRun(
        project_id=project_id,
        ifc_file_id=ifc_file_id,
        criteria_set_id=criteria_set_id,
        status="pending",
        started_at=None,
        finished_at=None,
        created_by=created_by,
    )
    db.add(audit_run)
    db.flush()
    return audit_run


def execute_audit_run(db: Session, audit_run: AuditRun, ifc_file: IfcFile, criteria: list[Criterion]) -> AuditRun:
    audit_run.status = "running"
    audit_run.error_message = None
    audit_run.started_at = datetime.utcnow()
    db.flush()

    try:
        evaluated_bundle: AuditEvaluationBundle = evaluate_criteria(ifc_file, criteria)
        score = calculate_score(
            [{"severity": item.severity, "status": item.status} for item in evaluated_bundle.summary_results]
        )

        db.execute(delete(AuditResult).where(AuditResult.audit_run_id == audit_run.id))
        for evaluated in evaluated_bundle.detailed_results:
            db.add(to_audit_result(audit_run.id, evaluated))

        audit_run.status = "completed"
        audit_run.score_percent = score.score_percent
        audit_run.score_low = score.by_severity.get("baixa")
        audit_run.score_moderate = score.by_severity.get("moderada")
        audit_run.score_high = score.by_severity.get("alta")
        audit_run.total_criteria = score.total_criteria
        audit_run.approved_criteria = score.approved_criteria
        audit_run.failed_criteria = score.failed_criteria
        audit_run.finished_at = datetime.utcnow()
        audit_run.error_message = None
        db.flush()
        return audit_run
    except Exception as exc:
        audit_run.status = "failed"
        audit_run.error_message = str(exc)
        audit_run.finished_at = datetime.utcnow()
        db.flush()
        raise


def execute_audit_run_by_id(db: Session, audit_run_id: str) -> AuditRun:
    audit_run = db.get(AuditRun, audit_run_id)
    if audit_run is None:
        raise ValueError("Audit run not found.")

    _, ifc_file, _, criteria = validate_audit_payload(
        db=db,
        project_id=audit_run.project_id,
        ifc_file_id=audit_run.ifc_file_id,
        criteria_set_id=audit_run.criteria_set_id,
    )
    return execute_audit_run(db, audit_run, ifc_file, criteria)


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
