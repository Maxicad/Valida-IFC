from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Severity = Literal["baixa", "moderada", "alta"]


class CriteriaSetCreate(BaseModel):
    name: str
    description: str | None = None
    source_type: str = "manual"


class CriteriaSetResponse(CriteriaSetCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class CriteriaSetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    source_type: str | None = None


class CriterionBase(BaseModel):
    criteria_set_id: str
    code: str
    name: str
    description: str | None = None
    category: str | None = None
    severity: Severity
    rule_type: str
    entity_ifc: str | None = None
    property_name: str | None = None
    operator: str | None = None
    expected_value: str | None = None
    failure_message: str | None = None
    fix_suggestion: str | None = None
    reference: str | None = None
    active: bool = True
    natural_language_source: str | None = None


class CriterionCreate(CriterionBase):
    pass


class CriterionUpdate(BaseModel):
    criteria_set_id: str | None = None
    code: str | None = None
    name: str | None = None
    description: str | None = None
    category: str | None = None
    severity: Severity | None = None
    rule_type: str | None = None
    entity_ifc: str | None = None
    property_name: str | None = None
    operator: str | None = None
    expected_value: str | None = None
    failure_message: str | None = None
    fix_suggestion: str | None = None
    reference: str | None = None
    active: bool | None = None
    natural_language_source: str | None = None


class CriterionResponse(CriterionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class NaturalLanguageCriterionRequest(BaseModel):
    text: str = Field(min_length=5)
    criteria_set_id: str | None = None


class NaturalLanguageCriterionResponse(BaseModel):
    source_text: str
    suggested_rule: CriterionBase
    requires_review: bool = True


class CriteriaImportError(BaseModel):
    row: int
    code: str | None = None
    message: str


class CriteriaImportResponse(BaseModel):
    criteria_set: CriteriaSetResponse
    file_name: str
    total_rows: int
    imported_count: int
    error_count: int
    errors: list[CriteriaImportError] = []
