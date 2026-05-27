import json
from datetime import datetime, timedelta
from pathlib import Path
from re import sub
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audits.ifc_adapter import IfcAuditContext
from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.models import AuditResult, AuditRun, Criterion, IfcFile, Project, User
from app.files.schemas import (
    IfcDisciplineUpdateRequest,
    IfcWorkspaceResponse,
    IfcFileResponse,
    IfcMetadataResponse,
    ViewerDataResponse,
    ViewerElementResponse,
    ViewerFragmentCacheResponse,
    ViewerGeometryElementResponse,
    ViewerGeometryResponse,
)
from ifc_utils.ifc_metadata import build_metadata_from_header
from ifc_utils.ifc_reader import read_ifc_schema_from_bytes

router = APIRouter(tags=["ifc-files"], dependencies=[Depends(get_current_user)])
ALLOWED_DISCIPLINES = {"arquitetura", "estrutura", "instalacoes", "coordenacao"}
FRAGMENT_FORMAT_VERSION = "thatopen-fragments-3.4.5"
VIEWER_INDEX_FORMAT_VERSION = "viewer-elements-v1"


def safe_file_name(file_name: str) -> str:
    name = Path(file_name).name
    return sub(r"[^A-Za-z0-9._-]+", "_", name)


def fragment_cache_path(ifc_file: IfcFile) -> Path:
    return Path(settings.local_storage_path) / "fragments" / ifc_file.project_id / f"{ifc_file.id}.frag"


def viewer_index_path(ifc_file: IfcFile) -> Path:
    return Path(settings.local_storage_path) / "viewer-index" / ifc_file.project_id / f"{ifc_file.id}.json"


def delete_fragment_cache(ifc_file: IfcFile) -> None:
    path = fragment_cache_path(ifc_file)
    if path.exists() and path.is_file():
        path.unlink()


def delete_viewer_index(ifc_file: IfcFile) -> None:
    path = viewer_index_path(ifc_file)
    if path.exists() and path.is_file():
        path.unlink()


def read_cached_viewer_index(ifc_file: IfcFile) -> list[dict[str, str | None]] | None:
    path = viewer_index_path(ifc_file)
    if not path.exists() or not path.is_file():
        return None

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    if not isinstance(payload, dict):
        return None
    if payload.get("format_version") != VIEWER_INDEX_FORMAT_VERSION:
        return None
    if payload.get("ifc_file_id") != ifc_file.id or payload.get("file_size") != ifc_file.file_size:
        return None

    rows = payload.get("elements")
    if not isinstance(rows, list):
        return None

    normalized_rows: list[dict[str, str | None]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        global_id = row.get("global_id")
        entity = row.get("entity")
        name = row.get("name")
        if not isinstance(global_id, str) or not global_id or not isinstance(entity, str) or not entity:
            continue
        normalized_rows.append(
            {
                "global_id": global_id,
                "entity": entity,
                "name": name if isinstance(name, str) and name else None,
            }
        )
    return normalized_rows


def write_viewer_index(ifc_file: IfcFile, rows: list[dict[str, str | None]]) -> None:
    path = viewer_index_path(ifc_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "format_version": VIEWER_INDEX_FORMAT_VERSION,
        "ifc_file_id": ifc_file.id,
        "file_size": ifc_file.file_size,
        "generated_at": datetime.utcnow().isoformat(),
        "elements": rows,
    }
    temp_path = path.with_suffix(".json.tmp")
    temp_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    temp_path.replace(path)


def get_or_create_viewer_index(ifc_file: IfcFile) -> list[dict[str, str | None]]:
    cached = read_cached_viewer_index(ifc_file)
    if cached is not None:
        return cached

    context = IfcAuditContext(ifc_file.file_path, schema_hint=ifc_file.ifc_schema)
    rows: list[dict[str, str | None]] = []
    for element in context.list_elements("IfcProduct"):
        if not element.guid:
            continue
        rows.append(
            {
                "global_id": element.guid,
                "entity": element.entity,
                "name": element.name,
            }
        )
    write_viewer_index(ifc_file, rows)
    return rows


def fragment_cache_response(ifc_file: IfcFile) -> ViewerFragmentCacheResponse:
    metadata = ifc_file.metadata_json or {}
    cache_metadata = metadata.get("viewer_fragment_cache")
    path = fragment_cache_path(ifc_file)
    cached = path.exists() and path.is_file()
    generated_at = None
    if isinstance(cache_metadata, dict) and isinstance(cache_metadata.get("generated_at"), str):
        try:
            generated_at = datetime.fromisoformat(cache_metadata["generated_at"])
        except ValueError:
            generated_at = None

    return ViewerFragmentCacheResponse(
        ifc_file_id=ifc_file.id,
        cached=cached,
        fragment_url=f"/ifc-files/{ifc_file.id}/viewer-fragment" if cached else None,
        byte_size=path.stat().st_size if cached else None,
        generated_at=generated_at if cached else None,
        format_version=FRAGMENT_FORMAT_VERSION if cached else None,
    )


@router.post(
    "/projects/{project_id}/ifc/upload",
    response_model=IfcFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_ifc(
    project_id: str,
    file: UploadFile = File(...),
    discipline: str | None = Form(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IfcFile:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    if not file.filename or not file.filename.lower().endswith(".ifc"):
        raise HTTPException(status_code=400, detail="Only .ifc files are accepted.")

    enforce_upload_limits(db=db, project_id=project_id, user_id=current_user.id)
    cleanup_expired_project_files(db=db, project_id=project_id)

    content = await file.read(settings.upload_max_bytes + 1)
    if len(content) > settings.upload_max_bytes:
        raise HTTPException(status_code=413, detail="IFC file is larger than the configured limit.")

    validate_ifc_content(content)

    schema = read_ifc_schema_from_bytes(content)
    metadata = build_metadata_from_header(content)
    if discipline and discipline.strip():
        metadata["discipline"] = discipline.strip().lower()

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


@router.get("/projects/{project_id}/ifc-workspace", response_model=IfcWorkspaceResponse)
def get_project_ifc_workspace(project_id: str, db: Session = Depends(get_db)) -> IfcWorkspaceResponse:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    ifc_files = list(
        db.scalars(
            select(IfcFile).where(IfcFile.project_id == project_id).order_by(IfcFile.uploaded_at.desc())
        )
    )
    selected = ifc_files[0].id if ifc_files else None

    return IfcWorkspaceResponse(
        project_id=project_id,
        ifc_files=ifc_files,
        selected_ifc_file_id=selected,
        viewer_data_url=f"/ifc-files/{selected}/viewer-data" if selected else None,
        viewer_geometry_url=f"/ifc-files/{selected}/viewer-geometry" if selected else None,
        viewer_page_url=f"/visualizador?ifc_file_id={selected}" if selected else None,
    )


@router.get("/ifc-files/{ifc_file_id}", response_model=IfcFileResponse)
def get_ifc_file(ifc_file_id: str, db: Session = Depends(get_db)) -> IfcFile:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")
    return ifc_file


@router.put("/ifc-files/{ifc_file_id}/discipline", response_model=IfcFileResponse)
def update_ifc_file_discipline(
    ifc_file_id: str,
    payload: IfcDisciplineUpdateRequest,
    db: Session = Depends(get_db),
) -> IfcFile:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    normalized = (payload.discipline or "").strip().lower()
    metadata = dict(ifc_file.metadata_json or {})
    if not normalized or normalized == "auto":
        metadata.pop("discipline", None)
    else:
        if normalized not in ALLOWED_DISCIPLINES:
            raise HTTPException(
                status_code=422,
                detail="Invalid discipline. Allowed: arquitetura, estrutura, instalacoes, coordenacao.",
            )
        metadata["discipline"] = normalized

    ifc_file.metadata_json = metadata
    db.commit()
    db.refresh(ifc_file)
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


@router.get("/ifc-files/{ifc_file_id}/download")
def download_ifc_file(ifc_file_id: str, db: Session = Depends(get_db)) -> FileResponse:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    stored_path = Path(ifc_file.file_path)
    if not stored_path.exists():
        raise HTTPException(status_code=404, detail="Stored IFC file not found.")

    return FileResponse(
        path=stored_path,
        filename=ifc_file.file_name,
        media_type="application/octet-stream",
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

    elements = get_or_create_viewer_index(ifc_file)
    for element in elements:
        global_id = element["global_id"]
        elements_payload.append(
            ViewerElementResponse(
                global_id=global_id,
                entity=element["entity"] or "IfcProduct",
                name=element["name"],
                status=status_map.get(global_id, "unknown"),
                severity=failed_severity_by_guid.get(global_id),
                failed_criteria_codes=sorted(failed_codes_by_guid.get(global_id, set())),
            )
        )

    return ViewerDataResponse(
        ifc_file_id=ifc_file_id,
        audit_run_id=latest_audit.id if latest_audit is not None else None,
        elements=elements_payload,
        status_map=status_map,
    )


@router.get("/ifc-files/{ifc_file_id}/viewer-geometry", response_model=ViewerGeometryResponse)
def get_viewer_geometry(ifc_file_id: str, db: Session = Depends(get_db)) -> ViewerGeometryResponse:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    if not Path(ifc_file.file_path).exists():
        raise HTTPException(status_code=404, detail="Stored IFC file not found.")

    context = IfcAuditContext(ifc_file.file_path, schema_hint=ifc_file.ifc_schema)
    raw_elements = context.extract_geometry(
        max_elements=settings.viewer_geometry_max_elements,
        max_triangles_per_element=settings.viewer_geometry_max_triangles_per_element,
    )

    return ViewerGeometryResponse(
        ifc_file_id=ifc_file_id,
        elements=[ViewerGeometryElementResponse(**row) for row in raw_elements],
    )


@router.get("/ifc-files/{ifc_file_id}/viewer-fragment-cache", response_model=ViewerFragmentCacheResponse)
def get_viewer_fragment_cache(ifc_file_id: str, db: Session = Depends(get_db)) -> ViewerFragmentCacheResponse:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    return fragment_cache_response(ifc_file)


@router.get("/ifc-files/{ifc_file_id}/viewer-fragment")
def download_viewer_fragment(ifc_file_id: str, db: Session = Depends(get_db)) -> FileResponse:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    path = fragment_cache_path(ifc_file)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Viewer fragment cache not found.")

    return FileResponse(
        path=path,
        filename=f"{Path(ifc_file.file_name).stem}.frag",
        media_type="application/octet-stream",
    )


@router.put("/ifc-files/{ifc_file_id}/viewer-fragment", response_model=ViewerFragmentCacheResponse)
async def upload_viewer_fragment(
    ifc_file_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> ViewerFragmentCacheResponse:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    content = await file.read(settings.viewer_fragment_max_bytes + 1)
    if len(content) > settings.viewer_fragment_max_bytes:
        raise HTTPException(status_code=413, detail="Viewer fragment cache is larger than the configured limit.")
    if not content:
        raise HTTPException(status_code=422, detail="Viewer fragment cache is empty.")

    path = fragment_cache_path(ifc_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)

    metadata = dict(ifc_file.metadata_json or {})
    metadata["viewer_fragment_cache"] = {
        "format_version": FRAGMENT_FORMAT_VERSION,
        "byte_size": len(content),
        "generated_at": datetime.utcnow().isoformat(),
    }
    ifc_file.metadata_json = metadata
    db.commit()
    db.refresh(ifc_file)
    return fragment_cache_response(ifc_file)


@router.delete("/ifc-files/{ifc_file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ifc_file(ifc_file_id: str, db: Session = Depends(get_db)) -> None:
    ifc_file = db.get(IfcFile, ifc_file_id)
    if ifc_file is None:
        raise HTTPException(status_code=404, detail="IFC file not found.")

    stored_path = Path(ifc_file.file_path)
    if stored_path.exists() and stored_path.is_file():
        stored_path.unlink()
    delete_fragment_cache(ifc_file)
    delete_viewer_index(ifc_file)

    db.delete(ifc_file)
    db.commit()


def _max_severity(current: str | None, incoming: str | None) -> str | None:
    order = {"baixa": 1, "moderada": 2, "alta": 3}
    if incoming is None:
        return current
    if current is None:
        return incoming
    return incoming if order.get(incoming, 0) >= order.get(current, 0) else current


def enforce_upload_limits(db: Session, project_id: str, user_id: str | None) -> None:
    total_files = db.scalar(select(func.count(IfcFile.id)).where(IfcFile.project_id == project_id)) or 0
    if total_files >= settings.upload_max_files_per_project:
        raise HTTPException(
            status_code=429,
            detail="Project reached maximum number of IFC files. Delete old files before uploading new ones.",
        )

    if user_id:
        user_files = (
            db.scalar(
                select(func.count(IfcFile.id)).where(
                    IfcFile.project_id == project_id,
                    IfcFile.uploaded_by == user_id,
                )
            )
            or 0
        )
        if user_files >= settings.upload_max_files_per_user_per_project:
            raise HTTPException(
                status_code=429,
                detail="User reached upload limit for this project.",
            )


def cleanup_expired_project_files(db: Session, project_id: str) -> None:
    if settings.storage_retention_days <= 0:
        return

    cutoff = datetime.utcnow() - timedelta(days=settings.storage_retention_days)
    old_files = list(
        db.scalars(
            select(IfcFile).where(IfcFile.project_id == project_id, IfcFile.uploaded_at < cutoff)
        )
    )
    if not old_files:
        return

    for item in old_files:
        stored_path = Path(item.file_path)
        if stored_path.exists() and stored_path.is_file():
            stored_path.unlink()
        delete_fragment_cache(item)
        db.delete(item)
    db.flush()


def validate_ifc_content(content: bytes) -> None:
    header = content[:2048].decode("utf-8", errors="ignore").upper()
    if "ISO-10303-21" not in header:
        raise HTTPException(status_code=422, detail="Malformed IFC: missing ISO-10303-21 signature.")
    if "FILE_SCHEMA" not in header:
        raise HTTPException(status_code=422, detail="Malformed IFC: FILE_SCHEMA not found in IFC header.")
