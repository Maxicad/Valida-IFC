from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditCreate(BaseModel):
    project_id: str
    ifc_file_id: str
    criteria_set_id: str


class AuditRunResponse(AuditCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    score_percent: float | None = None
    score_low: float | None = None
    score_moderate: float | None = None
    score_high: float | None = None
    total_criteria: int = 0
    approved_criteria: int = 0
    failed_criteria: int = 0
    started_at: datetime | None = None
    finished_at: datetime | None = None


class AuditResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    criteria_id: str
    code: str
    status: str
    severity: str
    message: str
    actual_value: str | None = None
    expected_value: str | None = None
    element_guid: str | None = None
    element_type: str | None = None
    element_name: str | None = None
    weight: int
    score_value: int = 0
    fix_suggestion: str | None = None
    is_summary: bool = False
