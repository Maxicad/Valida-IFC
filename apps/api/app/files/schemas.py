from datetime import datetime

from pydantic import BaseModel


class IfcFileResponse(BaseModel):
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
