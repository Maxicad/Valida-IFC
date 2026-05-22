from datetime import datetime

from pydantic import BaseModel


class AuditCreate(BaseModel):
    project_id: str
    ifc_file_id: str
    criteria_set_id: str


class AuditRunResponse(AuditCreate):
    id: str
    status: str
    score_percent: float | None = None
    total_criteria: int = 0
    approved_criteria: int = 0
    failed_criteria: int = 0
    started_at: datetime | None = None
    finished_at: datetime | None = None


class AuditResultResponse(BaseModel):
    criteria_id: str
    code: str
    status: str
    severity: str
    message: str
    actual_value: str | None = None
    expected_value: str | None = None
    element_guid: str | None = None
    element_type: str | None = None
    weight: int
