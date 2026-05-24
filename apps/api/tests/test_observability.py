from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
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


def test_request_id_header_and_metrics_endpoint(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-Id": "e2e-request-001"})

    assert response.status_code == 200
    assert response.headers["X-Request-Id"] == "e2e-request-001"

    metrics_response = client.get("/metrics")
    assert metrics_response.status_code == 200
    assert "valida_ifc_http_requests_total" in metrics_response.text
    assert 'route="/health"' in metrics_response.text


def test_alerts_endpoint_exposes_incident_state(client: TestClient) -> None:
    response = client.get("/alerts")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"ok", "firing"}
    assert "alerts" in payload


def test_alerts_include_failed_queue_jobs(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeFailedRegistry:
        count = 1

    class FakeQueue:
        failed_job_registry = FakeFailedRegistry()

        def __len__(self) -> int:
            return 0

    monkeypatch.setattr("app.core.queue.get_audit_queue", lambda: FakeQueue())

    from app.core.observability import active_alerts

    alerts = active_alerts()

    assert any(alert["name"] == "audit_queue_failed_jobs" for alert in alerts)
