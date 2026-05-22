from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    client: str
    description: str | None = None
    discipline: str | None = None
    phase: str | None = None
    responsible: str | None = None
    status: str = "em_preparacao"


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = None
    client: str | None = None
    description: str | None = None
    discipline: str | None = None
    phase: str | None = None
    responsible: str | None = None
    status: str | None = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime
