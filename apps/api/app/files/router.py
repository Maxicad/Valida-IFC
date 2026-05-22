from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.files.schemas import IfcFileResponse, IfcMetadataResponse
from ifc_utils.ifc_metadata import build_metadata_from_header
from ifc_utils.ifc_reader import read_ifc_schema_from_bytes

router = APIRouter(tags=["ifc-files"])


@router.post(
    "/projects/{project_id}/ifc/upload",
    response_model=IfcFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_ifc(project_id: str, file: UploadFile = File(...)) -> IfcFileResponse:
    if not file.filename or not file.filename.lower().endswith(".ifc"):
        raise HTTPException(status_code=400, detail="Only .ifc files are accepted.")

    content = await file.read(settings.upload_max_bytes + 1)
    if len(content) > settings.upload_max_bytes:
        raise HTTPException(status_code=413, detail="IFC file is larger than the configured limit.")

    schema = read_ifc_schema_from_bytes(content)
    metadata = build_metadata_from_header(content)

    return IfcFileResponse(
        id="ifc-file-new",
        project_id=project_id,
        file_name=file.filename,
        file_size=len(content),
        ifc_schema=schema,
        ifc_version=schema,
        uploaded_at=datetime.utcnow(),
        status="uploaded",
        metadata_json=metadata,
    )


@router.get("/projects/{project_id}/ifc-files", response_model=list[IfcFileResponse])
def list_project_ifc_files(project_id: str) -> list[IfcFileResponse]:
    return [
        IfcFileResponse(
            id="ifc-file-demo",
            project_id=project_id,
            file_name="modelo-demo.ifc",
            file_size=1024,
            ifc_schema="IFC4",
            ifc_version="IFC4",
            uploaded_at=datetime.utcnow(),
            status="metadata_extracted",
            metadata_json={"schema": "IFC4"},
        )
    ]


@router.get("/ifc-files/{ifc_file_id}", response_model=IfcFileResponse)
def get_ifc_file(ifc_file_id: str) -> IfcFileResponse:
    return IfcFileResponse(
        id=ifc_file_id,
        project_id="project-demo",
        file_name="modelo-demo.ifc",
        file_size=1024,
        ifc_schema="IFC4",
        ifc_version="IFC4",
        uploaded_at=datetime.utcnow(),
        status="metadata_extracted",
        metadata_json={"schema": "IFC4"},
    )


@router.get("/ifc-files/{ifc_file_id}/metadata", response_model=IfcMetadataResponse)
def get_ifc_metadata(ifc_file_id: str) -> IfcMetadataResponse:
    return IfcMetadataResponse(
        ifc_schema="IFC4",
        ifc_version="IFC4",
        metadata={"ifc_file_id": ifc_file_id, "source": "demo"},
    )


@router.get("/ifc-files/{ifc_file_id}/viewer-data")
def get_viewer_data(ifc_file_id: str) -> dict:
    return {"ifc_file_id": ifc_file_id, "elements": [], "status_map": {}}


@router.delete("/ifc-files/{ifc_file_id}")
def delete_ifc_file(ifc_file_id: str) -> dict[str, str]:
    return {"status": "deleted", "id": ifc_file_id}
