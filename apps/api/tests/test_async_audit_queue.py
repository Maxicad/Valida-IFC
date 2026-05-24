from collections.abc import Generator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from redis.exceptions import RedisError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.audits import jobs, router as audits_router, service as audit_service
from app.audits.engine import AuditEvaluationBundle, EvaluatedCriterion
from app.audits.jobs import process_audit_run
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.models import AuditRun, CriteriaSet, Criterion, IfcFile, Project, User
from app.main import app


@pytest.fixture()
def client(tmp_path: Path) -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    original_storage_path = settings.local_storage_path
    settings.local_storage_path = str(tmp_path / "storage")

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    settings.local_storage_path = original_storage_path
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session(tmp_path: Path) -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    original_storage_path = settings.local_storage_path
    settings.local_storage_path = str(tmp_path / "storage")

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        settings.local_storage_path = original_storage_path
        Base.metadata.drop_all(bind=engine)


def auth_headers(client: TestClient) -> dict[str, str]:
    register_response = client.post(
        "/auth/register",
        json={
            "name": "Auditor BIM",
            "email": "queue-auditor@example.com",
            "password": "secret123",
            "role": "auditor_bim",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={"email": "queue-auditor@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_api_audit_payload(client: TestClient, headers: dict[str, str]) -> dict[str, str]:
    project_id = client.post(
        "/projects",
        json={"name": "Projeto Async", "client": "Cliente Demo"},
        headers=headers,
    ).json()["id"]

    ifc_content = (
        b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n"
        b"#1=IFCPROJECT('0ProjectGuid',$,'Projeto',$,$,$,$,$,$);\nENDSEC;"
    )
    ifc_file_id = client.post(
        f"/projects/{project_id}/ifc/upload",
        files={"file": ("modelo.ifc", ifc_content, "application/octet-stream")},
        headers=headers,
    ).json()["id"]

    csv_content = (
        "codigo,nome,criticidade,tipo_regra,entidade_ifc,propriedade,operador,valor_esperado,ativo\n"
        "IFC-001,Versao minima IFC,alta,ifc_schema,,FILE_SCHEMA,in,IFC4|IFC4X3,sim\n"
    )
    criteria_set_id = client.post(
        "/criteria-sets/import",
        files={"file": ("criterios.csv", csv_content.encode("utf-8"), "text/csv")},
        headers=headers,
    ).json()["criteria_set"]["id"]

    return {
        "project_id": project_id,
        "ifc_file_id": ifc_file_id,
        "criteria_set_id": criteria_set_id,
    }


def test_async_audit_enqueues_without_sync_fallback(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = auth_headers(client)
    payload = create_api_audit_payload(client, headers)
    captured: dict[str, Any] = {}

    class FakeJob:
        id = "rq-job-123"

    class FakeQueue:
        def enqueue(self, func: Any, audit_id: str, **kwargs: Any) -> FakeJob:
            captured["func"] = func
            captured["audit_id"] = audit_id
            captured["kwargs"] = kwargs
            return FakeJob()

    monkeypatch.setattr(audits_router, "get_audit_queue", lambda: FakeQueue())

    response = client.post("/audits?mode=async", json=payload, headers=headers)

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "pending"
    assert data["queue_job_id"] == "rq-job-123"
    assert captured["audit_id"] == data["id"]
    assert captured["kwargs"]["job_timeout"] == settings.audit_job_timeout_seconds
    assert captured["kwargs"]["result_ttl"] == settings.audit_job_result_ttl_seconds
    assert captured["kwargs"]["failure_ttl"] == settings.audit_job_failure_ttl_seconds
    assert captured["kwargs"]["retry"].max == settings.audit_job_max_retries

    status_response = client.get(f"/audits/{data['id']}/status", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "pending"
    assert status_response.json()["queue_job_id"] == "rq-job-123"


def test_async_audit_marks_failed_when_redis_is_unavailable(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = auth_headers(client)
    payload = create_api_audit_payload(client, headers)

    class BrokenQueue:
        def enqueue(self, *_args: Any, **_kwargs: Any) -> None:
            raise RedisError("connection refused")

    monkeypatch.setattr(audits_router, "get_audit_queue", lambda: BrokenQueue())

    response = client.post("/audits?mode=async", json=payload, headers=headers)

    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["status"] == "failed"
    audit_id = detail["audit_id"]

    status_response = client.get(f"/audits/{audit_id}/status", headers=headers)
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "failed"
    assert "Audit queue unavailable" in status_response.json()["error_message"]


def seed_audit_run(db: Session, tmp_path: Path, *, bad_rule: bool = False) -> tuple[AuditRun, Criterion]:
    storage = tmp_path / "storage"
    storage.mkdir(parents=True, exist_ok=True)
    ifc_path = storage / "modelo.ifc"
    ifc_path.write_text(
        "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n"
        "#1=IFCPROJECT('0ProjectGuid',$,'Projeto',$,$,$,$,$,$);\nENDSEC;",
        encoding="utf-8",
    )

    user = User(name="Auditor", email=f"worker-{bad_rule}@example.com", password_hash="hash")
    db.add(user)
    db.flush()
    project = Project(name="Projeto Worker", client="Cliente Demo", created_by=user.id)
    db.add(project)
    db.flush()
    ifc_file = IfcFile(
        project_id=project.id,
        file_name="modelo.ifc",
        file_path=str(ifc_path),
        file_size=ifc_path.stat().st_size,
        ifc_schema="IFC4",
        uploaded_by=user.id,
    )
    db.add(ifc_file)
    criteria_set = CriteriaSet(name="Criterios Worker", source_type="manual", created_by=user.id)
    db.add(criteria_set)
    db.flush()
    criterion = Criterion(
        criteria_set_id=criteria_set.id,
        code="IFC-BAD" if bad_rule else "IFC-001",
        name="Regra Worker",
        severity="alta",
        rule_type="entity_count_min" if bad_rule else "ifc_schema",
        entity_ifc="IfcProject" if bad_rule else None,
        property_name="FILE_SCHEMA",
        operator="in",
        expected_value="not-a-number" if bad_rule else "IFC4|IFC4X3",
        active=True,
    )
    db.add(criterion)
    db.flush()
    audit_run = AuditRun(
        project_id=project.id,
        ifc_file_id=ifc_file.id,
        criteria_set_id=criteria_set.id,
        created_by=user.id,
        status="pending",
        queue_job_id="rq-job-worker",
    )
    db.add(audit_run)
    db.commit()
    db.refresh(audit_run)
    db.refresh(criterion)
    return audit_run, criterion


def test_worker_process_transitions_pending_running_completed(
    db_session: Session,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    audit_run, criterion = seed_audit_run(db_session, tmp_path)
    seen_running: list[str] = []

    def fake_evaluate_criteria(_ifc_file: IfcFile, _criteria: list[Criterion]) -> AuditEvaluationBundle:
        db_session.refresh(audit_run)
        assert audit_run.status == "running"
        seen_running.append(audit_run.status)
        result = EvaluatedCriterion(
            criteria_id=criterion.id,
            code=criterion.code,
            status="approved",
            severity=criterion.severity,
            message="Schema aprovado.",
            actual_value="IFC4",
            expected_value="IFC4|IFC4X3",
            weight=3,
            score_value=3,
            is_summary=True,
        )
        return AuditEvaluationBundle(summary_results=[result], detailed_results=[result])

    monkeypatch.setattr(jobs, "SessionLocal", lambda: db_session)
    monkeypatch.setattr(audit_service, "evaluate_criteria", fake_evaluate_criteria)

    audit_id = audit_run.id
    assert audit_run.status == "pending"
    result = process_audit_run(audit_id)

    updated_audit = db_session.get(AuditRun, audit_id)
    assert updated_audit is not None
    assert result == {"audit_run_id": audit_id, "status": "completed"}
    assert seen_running == ["running"]
    assert updated_audit.status == "completed"
    assert updated_audit.error_message is None
    assert updated_audit.score_percent == 100


def test_worker_process_persists_failed_status_and_error_message(
    db_session: Session,
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    audit_run, _ = seed_audit_run(db_session, tmp_path, bad_rule=True)
    audit_id = audit_run.id
    monkeypatch.setattr(jobs, "SessionLocal", lambda: db_session)

    with pytest.raises(ValueError):
        process_audit_run(audit_id)

    updated_audit = db_session.get(AuditRun, audit_id)
    assert updated_audit is not None
    assert updated_audit.status == "failed"
    assert updated_audit.error_message is not None
    assert "not-a-number" in updated_audit.error_message
