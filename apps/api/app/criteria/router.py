from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.models import CriteriaSet, Criterion, User
from app.criteria.schemas import (
    CriteriaImportError,
    CriteriaImportResponse,
    CriteriaSetCreate,
    CriteriaSetResponse,
    CriteriaSetUpdate,
    CriterionCreate,
    CriterionResponse,
    CriterionUpdate,
    NaturalLanguageCriterionRequest,
    NaturalLanguageCriterionResponse,
)
from app.criteria.importer import CriteriaImportValidationError, normalize_row, parse_criteria_file

router = APIRouter(tags=["criteria"], dependencies=[Depends(get_current_user)])


@router.get("/criteria-sets", response_model=list[CriteriaSetResponse])
def list_criteria_sets(db: Session = Depends(get_db)) -> list[CriteriaSet]:
    return list(db.scalars(select(CriteriaSet).order_by(CriteriaSet.created_at.desc())))


@router.post("/criteria-sets", response_model=CriteriaSetResponse, status_code=status.HTTP_201_CREATED)
def create_criteria_set(
    payload: CriteriaSetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CriteriaSet:
    criteria_set = CriteriaSet(created_by=current_user.id, **payload.model_dump())
    db.add(criteria_set)
    db.commit()
    db.refresh(criteria_set)
    return criteria_set


@router.get("/criteria-sets/{criteria_set_id}", response_model=CriteriaSetResponse)
def get_criteria_set(criteria_set_id: str, db: Session = Depends(get_db)) -> CriteriaSet:
    criteria_set = db.get(CriteriaSet, criteria_set_id)
    if criteria_set is None:
        raise HTTPException(status_code=404, detail="Criteria set not found.")
    return criteria_set


@router.put("/criteria-sets/{criteria_set_id}", response_model=CriteriaSetResponse)
def update_criteria_set(
    criteria_set_id: str,
    payload: CriteriaSetUpdate,
    db: Session = Depends(get_db),
) -> CriteriaSet:
    criteria_set = db.get(CriteriaSet, criteria_set_id)
    if criteria_set is None:
        raise HTTPException(status_code=404, detail="Criteria set not found.")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(criteria_set, key, value)

    db.commit()
    db.refresh(criteria_set)
    return criteria_set


@router.delete("/criteria-sets/{criteria_set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_criteria_set(criteria_set_id: str, db: Session = Depends(get_db)) -> None:
    criteria_set = db.get(CriteriaSet, criteria_set_id)
    if criteria_set is None:
        raise HTTPException(status_code=404, detail="Criteria set not found.")

    db.delete(criteria_set)
    db.commit()


@router.post("/criteria-sets/import", response_model=CriteriaImportResponse)
async def import_criteria(
    file: UploadFile = File(...),
    criteria_set_id: str | None = Form(default=None),
    name: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CriteriaImportResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Arquivo sem nome.")

    try:
        rows = parse_criteria_file(file.filename, await file.read())
    except CriteriaImportValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not rows:
        raise HTTPException(status_code=400, detail="Arquivo sem linhas de criterios.")

    criteria_set = db.get(CriteriaSet, criteria_set_id) if criteria_set_id else None
    if criteria_set_id and criteria_set is None:
        raise HTTPException(status_code=404, detail="Criteria set not found.")

    if criteria_set is None:
        criteria_set = CriteriaSet(
            name=name or Path(file.filename).stem,
            description=f"Importado de {file.filename}.",
            source_type="import",
            created_by=current_user.id,
        )
        db.add(criteria_set)
        db.flush()

    imported_count = 0
    errors: list[CriteriaImportError] = []

    for index, row in enumerate(rows, start=2):
        try:
            payload = normalize_row(row, criteria_set.id)
            criterion = Criterion(**payload.model_dump())
            db.add(criterion)
            imported_count += 1
        except CriteriaImportValidationError as exc:
            errors.append(
                CriteriaImportError(
                    row=index,
                    code=str(row.get("codigo") or row.get("code") or "") or None,
                    message=str(exc),
                )
            )

    if imported_count == 0:
        db.rollback()
    else:
        db.commit()
        db.refresh(criteria_set)

    return CriteriaImportResponse(
        criteria_set=criteria_set,
        file_name=file.filename,
        total_rows=len(rows),
        imported_count=imported_count,
        error_count=len(errors),
        errors=errors,
    )


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
def create_criterion(payload: CriterionCreate, db: Session = Depends(get_db)) -> Criterion:
    criteria_set = db.get(CriteriaSet, payload.criteria_set_id)
    if criteria_set is None:
        raise HTTPException(status_code=404, detail="Criteria set not found.")

    criterion = Criterion(**payload.model_dump())
    db.add(criterion)
    db.commit()
    db.refresh(criterion)
    return criterion


@router.get("/criteria", response_model=list[CriterionResponse])
def list_criteria(
    criteria_set_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Criterion]:
    statement = select(Criterion).order_by(Criterion.created_at.desc())
    if criteria_set_id is not None:
        statement = statement.where(Criterion.criteria_set_id == criteria_set_id)
    return list(db.scalars(statement))


@router.get("/criteria/{criterion_id}", response_model=CriterionResponse)
def get_criterion(criterion_id: str, db: Session = Depends(get_db)) -> Criterion:
    criterion = db.get(Criterion, criterion_id)
    if criterion is None:
        raise HTTPException(status_code=404, detail="Criterion not found.")
    return criterion


@router.put("/criteria/{criterion_id}", response_model=CriterionResponse)
def update_criterion(
    criterion_id: str,
    payload: CriterionUpdate,
    db: Session = Depends(get_db),
) -> Criterion:
    criterion = db.get(Criterion, criterion_id)
    if criterion is None:
        raise HTTPException(status_code=404, detail="Criterion not found.")

    update_data = payload.model_dump(exclude_unset=True)
    if criteria_set_id := update_data.get("criteria_set_id"):
        criteria_set = db.get(CriteriaSet, criteria_set_id)
        if criteria_set is None:
            raise HTTPException(status_code=404, detail="Criteria set not found.")

    for key, value in update_data.items():
        setattr(criterion, key, value)

    db.commit()
    db.refresh(criterion)
    return criterion


@router.delete("/criteria/{criterion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_criterion(criterion_id: str, db: Session = Depends(get_db)) -> None:
    criterion = db.get(Criterion, criterion_id)
    if criterion is None:
        raise HTTPException(status_code=404, detail="Criterion not found.")

    db.delete(criterion)
    db.commit()
