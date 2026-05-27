from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.models import AuditResult, AuditRun, AuditSnapshot, IfcFile, Project, Report, User
from app.projects.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"], dependencies=[Depends(get_current_user)])


def delete_fragment_cache(ifc_file: IfcFile) -> None:
    path = Path(settings.local_storage_path) / "fragments" / ifc_file.project_id / f"{ifc_file.id}.frag"
    if path.exists() and path.is_file():
        path.unlink()


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.created_at.desc())))


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Project:
    project = Project(created_by=current_user.id, **payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate, db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db)) -> None:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")

    ifc_files = list(db.scalars(select(IfcFile).where(IfcFile.project_id == project_id)))
    ifc_file_ids = [item.id for item in ifc_files]
    audit_runs = list(db.scalars(select(AuditRun).where(AuditRun.project_id == project_id)))
    audit_run_ids = [item.id for item in audit_runs]

    if audit_run_ids:
        snapshots = list(db.scalars(select(AuditSnapshot).where(AuditSnapshot.audit_run_id.in_(audit_run_ids))))
        for snapshot in snapshots:
            db.delete(snapshot)

        reports = list(db.scalars(select(Report).where(Report.audit_run_id.in_(audit_run_ids))))
        for report in reports:
            report_path = Path(report.file_path)
            if report_path.exists() and report_path.is_file():
                report_path.unlink()
            db.delete(report)

        results = list(db.scalars(select(AuditResult).where(AuditResult.audit_run_id.in_(audit_run_ids))))
        for result in results:
            db.delete(result)

        for audit in audit_runs:
            db.delete(audit)

    for ifc_file in ifc_files:
        stored_path = Path(ifc_file.file_path)
        if stored_path.exists() and stored_path.is_file():
            stored_path.unlink()
        delete_fragment_cache(ifc_file)
        db.delete(ifc_file)

    db.delete(project)
    db.commit()
