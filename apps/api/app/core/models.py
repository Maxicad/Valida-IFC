from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def new_id() -> str:
    return str(uuid4())


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(60), default="auditor_bim")


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(180))
    client: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text)
    discipline: Mapped[str | None] = mapped_column(String(120))
    phase: Mapped[str | None] = mapped_column(String(120))
    responsible: Mapped[str | None] = mapped_column(String(180))
    status: Mapped[str] = mapped_column(String(80), default="em_preparacao")
    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)


class IfcFile(Base):
    __tablename__ = "ifc_files"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"))
    file_name: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer)
    ifc_schema: Mapped[str | None] = mapped_column(String(40))
    ifc_version: Mapped[str | None] = mapped_column(String(40))
    uploaded_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(60), default="uploaded")
    metadata_json: Mapped[dict | None] = mapped_column(JSON)


class CriteriaSet(Base, TimestampMixin):
    __tablename__ = "criteria_sets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text)
    source_type: Mapped[str] = mapped_column(String(60), default="manual")
    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)


class Criterion(Base, TimestampMixin):
    __tablename__ = "criteria"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    criteria_set_id: Mapped[str] = mapped_column(String, ForeignKey("criteria_sets.id"))
    code: Mapped[str] = mapped_column(String(80), index=True)
    name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(120))
    severity: Mapped[str] = mapped_column(String(20))
    rule_type: Mapped[str] = mapped_column(String(80))
    entity_ifc: Mapped[str | None] = mapped_column(String(120))
    property_name: Mapped[str | None] = mapped_column(String(120))
    operator: Mapped[str | None] = mapped_column(String(80))
    expected_value: Mapped[str | None] = mapped_column(Text)
    failure_message: Mapped[str | None] = mapped_column(Text)
    fix_suggestion: Mapped[str | None] = mapped_column(Text)
    reference: Mapped[str | None] = mapped_column(String(180))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    natural_language_source: Mapped[str | None] = mapped_column(Text)


class AuditRun(Base):
    __tablename__ = "audit_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id"))
    ifc_file_id: Mapped[str] = mapped_column(String, ForeignKey("ifc_files.id"))
    criteria_set_id: Mapped[str] = mapped_column(String, ForeignKey("criteria_sets.id"))
    status: Mapped[str] = mapped_column(String(60), default="pending")
    score_percent: Mapped[float | None] = mapped_column(Float)
    score_low: Mapped[float | None] = mapped_column(Float)
    score_moderate: Mapped[float | None] = mapped_column(Float)
    score_high: Mapped[float | None] = mapped_column(Float)
    total_criteria: Mapped[int] = mapped_column(Integer, default=0)
    approved_criteria: Mapped[int] = mapped_column(Integer, default=0)
    failed_criteria: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_by: Mapped[str | None] = mapped_column(String, ForeignKey("users.id"), nullable=True)


class AuditResult(Base):
    __tablename__ = "audit_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    audit_run_id: Mapped[str] = mapped_column(String, ForeignKey("audit_runs.id"))
    criteria_id: Mapped[str] = mapped_column(String, ForeignKey("criteria.id"))
    element_guid: Mapped[str | None] = mapped_column(String(80))
    element_type: Mapped[str | None] = mapped_column(String(120))
    element_name: Mapped[str | None] = mapped_column(String(180))
    status: Mapped[str] = mapped_column(String(40))
    severity: Mapped[str] = mapped_column(String(20))
    message: Mapped[str | None] = mapped_column(Text)
    actual_value: Mapped[str | None] = mapped_column(Text)
    expected_value: Mapped[str | None] = mapped_column(Text)
    weight: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    audit_run_id: Mapped[str] = mapped_column(String, ForeignKey("audit_runs.id"))
    file_path: Mapped[str] = mapped_column(String(500))
    format: Mapped[str] = mapped_column(String(20), default="html")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
