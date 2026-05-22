from datetime import datetime

from fastapi import APIRouter, status

from app.projects.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])

DEMO_PROJECT = ProjectResponse(
    id="project-demo",
    name="Edificio Exemplo",
    client="Cliente Demo",
    description="Projeto de demonstracao para auditoria IFC.",
    discipline="Arquitetura",
    phase="Projeto Executivo",
    responsible="Auditor BIM",
    status="aguardando_ifc",
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow(),
)


@router.get("", response_model=list[ProjectResponse])
def list_projects() -> list[ProjectResponse]:
    return [DEMO_PROJECT]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate) -> ProjectResponse:
    now = datetime.utcnow()
    return ProjectResponse(id="project-new", created_at=now, updated_at=now, **payload.model_dump())


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str) -> ProjectResponse:
    return DEMO_PROJECT.model_copy(update={"id": project_id})


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, payload: ProjectUpdate) -> ProjectResponse:
    data = DEMO_PROJECT.model_dump()
    data.update({key: value for key, value in payload.model_dump().items() if value is not None})
    data["id"] = project_id
    data["updated_at"] = datetime.utcnow()
    return ProjectResponse(**data)


@router.delete("/{project_id}")
def delete_project(project_id: str) -> dict[str, str]:
    return {"status": "deleted", "id": project_id}
