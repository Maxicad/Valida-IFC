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
    discipline: str | None = None
    metadata_json: dict | None = None


class IfcMetadataResponse(BaseModel):
    ifc_schema: str | None
    ifc_version: str | None
    metadata: dict


class IfcDisciplineUpdateRequest(BaseModel):
    discipline: str | None = None


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


class ViewerFragmentCacheResponse(BaseModel):
    ifc_file_id: str
    cached: bool
    fragment_url: str | None = None
    byte_size: int | None = None
    generated_at: datetime | None = None
    format_version: str | None = None


class IfcWorkspaceResponse(BaseModel):
    project_id: str
    ifc_files: list[IfcFileResponse]
    selected_ifc_file_id: str | None = None
    viewer_data_url: str | None = None
    viewer_geometry_url: str | None = None
    viewer_page_url: str | None = None
