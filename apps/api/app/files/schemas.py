from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class IfcFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    file_name: str
    file_size: int
    ifc_schema: str | None = None
    ifc_version: str | None = None
    uploaded_at: datetime
    status: str
    metadata_json: dict | None = None


class IfcMetadataResponse(BaseModel):
    ifc_schema: str | None
    ifc_version: str | None
    metadata: dict


class ViewerElementResponse(BaseModel):
    global_id: str
    entity: str
    name: str | None = None
    status: str = "unknown"
    severity: str | None = None
    failed_criteria_codes: list[str] = Field(default_factory=list)


class ViewerDataResponse(BaseModel):
    ifc_file_id: str
    audit_run_id: str | None = None
    elements: list[ViewerElementResponse]
    status_map: dict[str, str]


class ViewerGeometryElementResponse(BaseModel):
    global_id: str
    entity: str
    name: str | None = None
    express_id: int | None = None
    vertices: list[float]
    indices: list[int]


class ViewerGeometryResponse(BaseModel):
    ifc_file_id: str
    elements: list[ViewerGeometryElementResponse]
