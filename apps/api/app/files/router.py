from datetime import datetime
from pathlib import Path
from re import sub
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audits.ifc_adapter import IfcAuditContext
from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.models import AuditResult, AuditRun, Criterion, IfcFile, Project, User
from app.files.schemas import IfcFileResponse, IfcMetadataResponse, ViewerDataResponse, ViewerElementResponse
from ifc_utils.ifc_metadata import build_metadata_from_header
from ifc_utils.ifc_reader import read_ifc_schema_from_bytes

router = APIRouter(tags=["ifc-files"], dependencies=[Depends(get_current_user)])


def safe_file_name(file_name: str) -> str:
    name = Path(file_name).name
    return sub(r"[^A-Za-z0-9._-]+", "_", name)


@router.post(
    "/projects/{project_id}/ifc/upload",
    response_model=IfcFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_ifc(
    project_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IfcFile:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    if not file.filename or not file.filename.lower().endswith(".ifc"):
        raise HTTPException(status_code=400, detail="Only .ifc files are accepted.")

    content = await file.read(settings.upload_max_bytes + 1)
    if len(content) > settings.upload_max_bytes:
        raise HTTPException(status_code=413, detail="IFC file is larger than the configured limit.")

    schema = read_ifc_schema_from_bytes(content)
    metadata = build_metadata_from_header(content)

    storage_dir = Path(settings.local_storage_path) / "ifc" / project_id
    storage_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4()}_{safe_file_name(file.filename)}"
    stored_path = storage_dir / stored_name
    stored_path.write_bytes(content)

    ifc_file = IfcFile(
        project_id=project_id,
        file_name=file.filename,
        file_path=str(stored_path),
        file_size=len(content),
        ifc_schema=schema,
        ifc_version=schema,
        uploaded_by=current_user.id,
        uploaded_at=datetime.utcnow(),
        status="metadata_extracted" if schema else "uploaded",
        metadata_json=metadata,
    )
    db.add(ifc_file)
    db.commit()
    db.refresh(ifc_file)
    return ifc_file


@router.get("/projects/{project_id}/ifc-files", response_model=list[IfcFileResponse])
def list_project_ifc_files(project_id: str, db: Session = Depends(get_db)) -> list[IfcFile]:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    return list(
        db.scalars(
            select(IfcFile).where(IfcFile.project_id == project_id).order_by(IfcFile.uploaded_at.desc())
        )
    )


@router.get("/ifc-files/{ifc_file_id}", response_model=IfcFileResponse)
def get_ifc_file(ifc_file_id: str, db: Session = Depends(get_db)) -> IfcFile:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")
    return ifc_file


@router.get("/ifc-files/{ifc_file_id}/metadata", response_model=IfcMetadataResponse)
def get_ifc_metadata(ifc_file_id: str, db: Session = Depends(get_db)) -> IfcMetadataResponse:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    return IfcMetadataResponse(
        ifc_schema=ifc_file.ifc_schema,
        ifc_version=ifc_file.ifc_version,
        metadata=ifc_file.metadata_json or {},
    )


@router.get("/ifc-files/{ifc_file_id}/viewer-data", response_model=ViewerDataResponse)
def get_viewer_data(ifc_file_id: str, db: Session = Depends(get_db)) -> ViewerDataResponse:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    if not Path(ifc_file.file_path).exists():
        raise HTTPException(status_code=404, detail="Stored IFC file not found.")

    latest_audit = db.scalar(
        select(AuditRun)
        .where(AuditRun.ifc_file_id == ifc_file_id, AuditRun.status == "completed")
        .order_by(AuditRun.finished_at.desc(), AuditRun.started_at.desc())
    )

    status_map: dict[str, str] = {}
    elements_payload: list[ViewerElementResponse] = []
    failed_codes_by_guid: dict[str, set[str]] = {}
    failed_severity_by_guid: dict[str, str] = {}

    if latest_audit is not None:
        rows = db.execute(
            select(AuditResult, Criterion.code)
            .join(Criterion, Criterion.id == AuditResult.criteria_id)
            .where(
                AuditResult.audit_run_id == latest_audit.id,
                AuditResult.element_guid.is_not(None),
                AuditResult.is_summary.is_(False),
            )
            .order_by(AuditResult.created_at.asc())
        ).all()
        for audit_result, code in rows:
            if not audit_result.element_guid:
                continue
            guid = audit_result.element_guid
            if audit_result.status == "failed":
                status_map[guid] = "failed"
                failed_codes_by_guid.setdefault(guid, set()).add(code)
                failed_severity_by_guid[guid] = _max_severity(
                    failed_severity_by_guid.get(guid), audit_result.severity
                )
            elif guid not in status_map:
                status_map[guid] = "approved"

    context = IfcAuditContext(ifc_file.file_path, schema_hint=ifc_file.ifc_schema)
    elements = context.list_elements("IfcProduct")
    for element in elements:
        if not element.guid:
            continue
        elements_payload.append(
            ViewerElementResponse(
                global_id=element.guid,
                entity=element.entity,
                name=element.name,
                status=status_map.get(element.guid, "unknown"),
                severity=failed_severity_by_guid.get(element.guid),
                failed_criteria_codes=sorted(failed_codes_by_guid.get(element.guid, set())),
            )
        )

    return ViewerDataResponse(
        ifc_file_id=ifc_file_id,
        audit_run_id=latest_audit.id if latest_audit is not None else None,
        elements=elements_payload,
        status_map=status_map,
    )


@router.delete("/ifc-files/{ifc_file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ifc_file(ifc_file_id: str, db: Session = Depends(get_db)) -> None:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    stored_path = Path(ifc_file.file_path)
    if stored_path.exists() and stored_path.is_file():
        stored_path.unlink()

    db.delete(ifc_file)
    db.commit()


def _max_severity(current: str | None, incoming: str | None) -> str | None:
    order = {"baixa": 1, "moderada": 2, "alta": 3}
    if incoming is None:
        return current
    if current is None:
        return incoming
    return incoming if order.get(incoming, 0) >= order.get(current, 0) else current
