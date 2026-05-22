from datetime import datetime

from fastapi import APIRouter, UploadFile

from app.criteria.schemas import (
    CriteriaSetCreate,
    CriteriaSetResponse,
    CriterionCreate,
    CriterionResponse,
    NaturalLanguageCriterionRequest,
    NaturalLanguageCriterionResponse,
)

router = APIRouter(tags=["criteria"])


def now() -> datetime:
    return datetime.utcnow()


@router.get("/criteria-sets", response_model=list[CriteriaSetResponse])
def list_criteria_sets() -> list[CriteriaSetResponse]:
    timestamp = now()
    return [
        CriteriaSetResponse(
            id="criteria-set-demo",
            name="Criterios BIM Basicos",
            description="Conjunto inicial para auditoria IFC.",
            source_type="sample",
            created_at=timestamp,
            updated_at=timestamp,
        )
    ]


@router.post("/criteria-sets", response_model=CriteriaSetResponse)
def create_criteria_set(payload: CriteriaSetCreate) -> CriteriaSetResponse:
    timestamp = now()
    return CriteriaSetResponse(id="criteria-set-new", created_at=timestamp, updated_at=timestamp, **payload.model_dump())


@router.get("/criteria-sets/{criteria_set_id}", response_model=CriteriaSetResponse)
def get_criteria_set(criteria_set_id: str) -> CriteriaSetResponse:
    timestamp = now()
    return CriteriaSetResponse(
        id=criteria_set_id,
        name="Criterios BIM Basicos",
        description="Conjunto inicial para auditoria IFC.",
        source_type="sample",
        created_at=timestamp,
        updated_at=timestamp,
    )


@router.post("/criteria-sets/import")
async def import_criteria(file: UploadFile) -> dict:
    return {
        "file_name": file.filename,
        "status": "received",
        "message": "Importacao estruturada sera implementada na proxima etapa.",
    }


@router.post("/criteria/from-natural-language", response_model=NaturalLanguageCriterionResponse)
def criterion_from_natural_language(
    payload: NaturalLanguageCriterionRequest,
) -> NaturalLanguageCriterionResponse:
    suggested = {
        "criteria_set_id": payload.criteria_set_id or "criteria-set-demo",
        "code": "AUTO-001",
        "name": "Ambientes com nome preenchido",
        "description": "Verifica se todos os IfcSpace possuem Name preenchido.",
        "category": "Espacos",
        "severity": "moderada",
        "rule_type": "property_not_empty",
        "entity_ifc": "IfcSpace",
        "property_name": "Name",
        "operator": "not_empty",
        "expected_value": None,
        "failure_message": "Ambiente sem nome preenchido.",
        "fix_suggestion": "Preencher o nome do ambiente no software autoral.",
        "reference": "Requisito BIM",
        "active": True,
        "natural_language_source": payload.text,
    }
    return NaturalLanguageCriterionResponse(
        source_text=payload.text,
        suggested_rule=suggested,
    )


@router.post("/criteria", response_model=CriterionResponse)
def create_criterion(payload: CriterionCreate) -> CriterionResponse:
    timestamp = now()
    return CriterionResponse(id="criterion-new", created_at=timestamp, updated_at=timestamp, **payload.model_dump())


@router.put("/criteria/{criterion_id}", response_model=CriterionResponse)
def update_criterion(criterion_id: str, payload: CriterionCreate) -> CriterionResponse:
    timestamp = now()
    return CriterionResponse(id=criterion_id, created_at=timestamp, updated_at=timestamp, **payload.model_dump())


@router.delete("/criteria/{criterion_id}")
def delete_criterion(criterion_id: str) -> dict[str, str]:
    return {"status": "deleted", "id": criterion_id}
