from datetime import datetime

from fastapi import APIRouter, status

from app.audits.schemas import AuditCreate, AuditResultResponse, AuditRunResponse
from rules_engine.scoring import calculate_score

router = APIRouter(prefix="/audits", tags=["audits"])


@router.post("", response_model=AuditRunResponse, status_code=status.HTTP_201_CREATED)
def create_audit(payload: AuditCreate) -> AuditRunResponse:
    results = [
        {"severity": "alta", "status": "approved"},
        {"severity": "moderada", "status": "failed"},
        {"severity": "baixa", "status": "approved"},
    ]
    score = calculate_score(results)
    return AuditRunResponse(
        id="audit-run-new",
        status="completed",
        score_percent=score.score_percent,
        total_criteria=score.total_criteria,
        approved_criteria=score.approved_criteria,
        failed_criteria=score.failed_criteria,
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow(),
        **payload.model_dump(),
    )


@router.get("/{audit_id}", response_model=AuditRunResponse)
def get_audit(audit_id: str) -> AuditRunResponse:
    return AuditRunResponse(
        id=audit_id,
        project_id="project-demo",
        ifc_file_id="ifc-file-demo",
        criteria_set_id="criteria-set-demo",
        status="completed",
        score_percent=66.67,
        total_criteria=3,
        approved_criteria=2,
        failed_criteria=1,
        started_at=datetime.utcnow(),
        finished_at=datetime.utcnow(),
    )


@router.get("/{audit_id}/status")
def get_audit_status(audit_id: str) -> dict[str, str]:
    return {"id": audit_id, "status": "completed"}


@router.get("/{audit_id}/summary")
def get_audit_summary(audit_id: str) -> dict:
    return {
        "id": audit_id,
        "score_percent": 66.67,
        "classification": "Reprovado parcialmente",
        "has_high_severity_failure": False,
    }


@router.get("/{audit_id}/results", response_model=list[AuditResultResponse])
def get_audit_results(audit_id: str) -> list[AuditResultResponse]:
    return [
        AuditResultResponse(
            criteria_id="IFC-001",
            code="IFC-001",
            status="approved",
            severity="alta",
            message="Arquivo esta em schema IFC4.",
            actual_value="IFC4",
            expected_value="IFC4|IFC4X3",
            weight=5,
        ),
        AuditResultResponse(
            criteria_id="IFC-005",
            code="IFC-005",
            status="failed",
            severity="moderada",
            message="Ambiente sem nome preenchido.",
            element_guid="2K9xDemoGlobalId",
            element_type="IfcSpace",
            weight=3,
        ),
    ]
