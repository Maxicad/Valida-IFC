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
    queue_job_id: str | None = None
    error_message: str | None = None


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


class AuditHistoryItem(AuditRunResponse):
    project_name: str
    ifc_file_name: str
    criteria_set_name: str
    snapshot_count: int = 0


class SnapshotCreate(BaseModel):
    expires_in_days: int = 30


class SnapshotResponse(BaseModel):
    id: str
    audit_run_id: str
    token: str
    view_url: str
    report_html_url: str
    expires_at: datetime


class AuditFailureItem(BaseModel):
    code: str
    element_guid: str | None = None
    element_name: str | None = None
    severity: str
    message: str
    fix_suggestion: str | None = None


class AuditComparisonResponse(BaseModel):
    base_audit_id: str
    target_audit_id: str
    score_delta: float
    new_failures: list[AuditFailureItem]
    resolved_failures: list[AuditFailureItem]
    persistent_failures: list[AuditFailureItem]
