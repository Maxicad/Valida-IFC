from collections.abc import Generator
from datetime import datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.auth import router as auth_router
from app.core.models import AuditSnapshot, IfcFile
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


def auth_headers(client: TestClient) -> dict[str, str]:
    register_response = client.post(
        "/auth/register",
        json={
            "name": "Auditor BIM",
            "email": "auditor@example.com",
            "password": "secret123",
            "role": "auditor_bim",
        },
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={"email": "auditor@example.com", "password": "secret123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_register_login_and_me(client: TestClient) -> None:
    headers = auth_headers(client)

    response = client.get("/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "auditor@example.com"


def test_google_login_creates_user_and_internal_jwt(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "google_client_id", "google-alpha-client")

    def fake_verify_google_id_token(id_token: str) -> dict[str, object]:
        assert id_token == "valid-google-id-token"
        return {
            "sub": "google-user-001",
            "email": "alpha.user@example.com",
            "email_verified": True,
            "name": "Alpha User",
        }

    monkeypatch.setattr(auth_router, "verify_google_id_token", fake_verify_google_id_token)

    response = client.post("/auth/google", json={"id_token": "valid-google-id-token"})

    assert response.status_code == 200
    token = response.json()["access_token"]
    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "alpha.user@example.com"
    assert me_response.json()["name"] == "Alpha User"

    password_login = client.post(
        "/auth/login",
        json={"email": "alpha.user@example.com", "password": "secret123"},
    )
    assert password_login.status_code == 401


def test_google_login_requires_verified_email(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "google_client_id", "google-alpha-client")
    monkeypatch.setattr(
        auth_router,
        "verify_google_id_token",
        lambda _id_token: {
            "sub": "google-user-002",
            "email": "unverified@example.com",
            "email_verified": False,
            "name": "Unverified User",
        },
    )

    response = client.post("/auth/google", json={"id_token": "unverified-google-id-token"})

    assert response.status_code == 401
    assert response.json()["detail"] == "Google account email is not verified."


def test_project_and_criteria_crud_use_database(client: TestClient) -> None:
    headers = auth_headers(client)

    project_response = client.post(
        "/projects",
        json={"name": "Hospital Central", "client": "Cliente Demo"},
        headers=headers,
    )
    assert project_response.status_code == 201
    assert project_response.json()["name"] == "Hospital Central"

    criteria_set_response = client.post(
        "/criteria-sets",
        json={"name": "Criterios Basicos", "source_type": "manual"},
        headers=headers,
    )
    assert criteria_set_response.status_code == 201
    criteria_set_id = criteria_set_response.json()["id"]

    criterion_response = client.post(
        "/criteria",
        json={
            "criteria_set_id": criteria_set_id,
            "code": "IFC-001",
            "name": "Versao minima IFC",
            "severity": "alta",
            "rule_type": "ifc_schema",
            "property_name": "FILE_SCHEMA",
            "operator": "in",
            "expected_value": "IFC4|IFC4X3",
        },
        headers=headers,
    )
    assert criterion_response.status_code == 200

    list_response = client.get(f"/criteria?criteria_set_id={criteria_set_id}", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()[0]["code"] == "IFC-001"


def test_upload_ifc_saves_file_and_metadata(client: TestClient) -> None:
    headers = auth_headers(client)
    project_response = client.post(
        "/projects",
        json={"name": "Hospital Central", "client": "Cliente Demo"},
        headers=headers,
    )
    project_id = project_response.json()["id"]

    ifc_content = b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;"
    upload_response = client.post(
        f"/projects/{project_id}/ifc/upload",
        files={"file": ("modelo.ifc", ifc_content, "application/octet-stream")},
        headers=headers,
    )

    assert upload_response.status_code == 201
    data = upload_response.json()
    assert data["ifc_schema"] == "IFC4"
    assert data["file_size"] == len(ifc_content)

    list_response = client.get(f"/projects/{project_id}/ifc-files", headers=headers)
    assert list_response.status_code == 200
    assert list_response.json()[0]["file_name"] == "modelo.ifc"


def test_upload_rejects_malformed_ifc(client: TestClient) -> None:
    headers = auth_headers(client)
    project_id = client.post(
        "/projects",
        json={"name": "Hospital Central", "client": "Cliente Demo"},
        headers=headers,
    ).json()["id"]

    bad_content = b"NOT-IFC\nHEADER;\nFILE_SCHEMA(('IFC4'));"
    response = client.post(
        f"/projects/{project_id}/ifc/upload",
        files={"file": ("ruim.ifc", bad_content, "application/octet-stream")},
        headers=headers,
    )

    assert response.status_code == 422
    assert "Malformed IFC" in response.json()["detail"]


def test_import_criteria_and_run_audit(client: TestClient) -> None:
    headers = auth_headers(client)
    project_response = client.post(
        "/projects",
        json={"name": "Hospital Central", "client": "Cliente Demo"},
        headers=headers,
    )
    project_id = project_response.json()["id"]

    ifc_content = (
        b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n"
        b"#1=IFCPROJECT('0ProjectGuid',$,'Projeto',$,$,$,$,$,$);\nENDSEC;"
    )
    upload_response = client.post(
        f"/projects/{project_id}/ifc/upload",
        files={"file": ("modelo.ifc", ifc_content, "application/octet-stream")},
        headers=headers,
    )
    ifc_file_id = upload_response.json()["id"]

    csv_content = (
        "codigo,nome,criticidade,tipo_regra,entidade_ifc,propriedade,operador,valor_esperado,ativo\n"
        "IFC-001,Versao minima IFC,alta,ifc_schema,,FILE_SCHEMA,in,IFC4|IFC4X3,sim\n"
        "IFC-002,Existe projeto,alta,entity_exists,IfcProject,,exists,,sim\n"
    )
    import_response = client.post(
        "/criteria-sets/import",
        files={"file": ("criterios.csv", csv_content.encode("utf-8"), "text/csv")},
        headers=headers,
    )
    assert import_response.status_code == 200
    assert import_response.json()["imported_count"] == 2
    criteria_set_id = import_response.json()["criteria_set"]["id"]

    audit_response = client.post(
        "/audits?mode=sync",
        json={
            "project_id": project_id,
            "ifc_file_id": ifc_file_id,
            "criteria_set_id": criteria_set_id,
        },
        headers=headers,
    )
    assert audit_response.status_code == 201
    assert audit_response.json()["score_percent"] == 100

    results_response = client.get(f"/audits/{audit_response.json()['id']}/results", headers=headers)
    assert results_response.status_code == 200
    assert {item["code"] for item in results_response.json()} == {"IFC-001", "IFC-002"}


def test_import_ids_mvp_maps_to_rules_and_report_guidance(client: TestClient) -> None:
    headers = auth_headers(client)
    project_id = client.post(
        "/projects",
        json={"name": "Projeto IDS", "client": "Cliente Demo"},
        headers=headers,
    ).json()["id"]

    ifc_content = (
        b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n"
        b"#10=IFCWALL('WALL_IDS',$,'Parede Fora',$,$,$,$,$);\nENDSEC;"
    )
    ifc_file_id = client.post(
        f"/projects/{project_id}/ifc/upload",
        files={"file": ("ids.ifc", ifc_content, "application/octet-stream")},
        headers=headers,
    ).json()["id"]

    ids_content = b"""<?xml version="1.0" encoding="UTF-8"?>
<ids:ids xmlns:ids="http://standards.buildingsmart.org/IDS">
  <ids:specifications>
    <ids:specification name="Parede com nome aprovado">
      <ids:applicability>
        <ids:entity>
          <ids:name><ids:simpleValue>IFCWALL</ids:simpleValue></ids:name>
        </ids:entity>
      </ids:applicability>
      <ids:requirements>
        <ids:property minOccurs="1">
          <ids:name><ids:simpleValue>Name</ids:simpleValue></ids:name>
          <ids:value><ids:simpleValue>Parede Conforme</ids:simpleValue></ids:value>
        </ids:property>
      </ids:requirements>
    </ids:specification>
  </ids:specifications>
</ids:ids>
"""
    import_response = client.post(
        "/criteria-sets/import",
        files={"file": ("parede.ids", ids_content, "application/xml")},
        headers=headers,
    )
    assert import_response.status_code == 200
    import_payload = import_response.json()
    assert import_payload["criteria_set"]["source_type"] == "ids"
    assert import_payload["imported_count"] == 1
    criteria_set_id = import_payload["criteria_set"]["id"]

    criteria_response = client.get(f"/criteria?criteria_set_id={criteria_set_id}", headers=headers)
    assert criteria_response.status_code == 200
    criterion = criteria_response.json()[0]
    assert criterion["rule_type"] == "property_value_in_list"
    assert criterion["entity_ifc"] == "IfcWall"
    assert criterion["property_name"] == "Name"
    assert criterion["expected_value"] == "Parede Conforme"
    assert "Revit/Archicad" in criterion["fix_suggestion"]

    audit_response = client.post(
        "/audits?mode=sync",
        json={
            "project_id": project_id,
            "ifc_file_id": ifc_file_id,
            "criteria_set_id": criteria_set_id,
        },
        headers=headers,
    )
    assert audit_response.status_code == 201
    audit = audit_response.json()
    assert audit["status"] == "completed"
    assert audit["failed_criteria"] == 1

    results = client.get(f"/audits/{audit['id']}/results", headers=headers).json()
    failed_rows = [row for row in results if row["status"] == "failed"]
    assert any(row["element_guid"] == "WALL_IDS" for row in failed_rows)
    assert any("IDS exige Name" in row["message"] for row in failed_rows)
    assert all(row["fix_suggestion"] for row in failed_rows)

    report_html = client.get(f"/audits/{audit['id']}/report/html")
    assert report_html.status_code == 200
    assert "Parede Conforme" in report_html.text
    assert "Revit/Archicad" in report_html.text


def test_ids_import_returns_clear_validation_error(client: TestClient) -> None:
    headers = auth_headers(client)
    bad_ids = b"""<ids:ids xmlns:ids="http://standards.buildingsmart.org/IDS">
  <ids:specifications>
    <ids:specification name="Sem entidade">
      <ids:requirements>
        <ids:property><ids:name><ids:simpleValue>Name</ids:simpleValue></ids:name></ids:property>
      </ids:requirements>
    </ids:specification>
  </ids:specifications>
</ids:ids>"""

    response = client.post(
        "/criteria-sets/import",
        files={"file": ("invalido.ids", bad_ids, "application/xml")},
        headers=headers,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["imported_count"] == 0
    assert payload["error_count"] == 1
    assert "IDS MVP exige uma entidade" in payload["errors"][0]["message"]


def test_storage_lifecycle_removes_expired_project_files_before_upload(client: TestClient) -> None:
    headers = auth_headers(client)
    project_id = client.post(
        "/projects",
        json={"name": "Projeto Retencao", "client": "Cliente Demo"},
        headers=headers,
    ).json()["id"]

    original_retention_days = settings.storage_retention_days
    settings.storage_retention_days = 1
    old_path = Path(settings.local_storage_path) / "ifc" / project_id / "old.ifc"
    old_path.parent.mkdir(parents=True, exist_ok=True)
    old_path.write_bytes(b"old")

    override_get_db = app.dependency_overrides[get_db]
    db_generator = override_get_db()
    db = next(db_generator)
    try:
        db.add(
            IfcFile(
                project_id=project_id,
                file_name="old.ifc",
                file_path=str(old_path),
                file_size=3,
                ifc_schema="IFC4",
                ifc_version="IFC4",
                uploaded_at=datetime.utcnow() - timedelta(days=2),
                status="metadata_extracted",
                metadata_json={},
            )
        )
        db.commit()
    finally:
        db.close()
        db_generator.close()

    try:
        new_ifc = b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;"
        upload_response = client.post(
            f"/projects/{project_id}/ifc/upload",
            files={"file": ("novo.ifc", new_ifc, "application/octet-stream")},
            headers=headers,
        )
        assert upload_response.status_code == 201
        assert not old_path.exists()

        list_response = client.get(f"/projects/{project_id}/ifc-files", headers=headers)
        assert [item["file_name"] for item in list_response.json()] == ["novo.ifc"]
    finally:
        settings.storage_retention_days = original_retention_days


def test_protected_file_and_criteria_routes_require_authentication(client: TestClient) -> None:
    assert client.get("/criteria-sets").status_code in {401, 403}
    assert client.get("/ifc-files/not-found/download").status_code in {401, 403}


def test_audit_persists_element_results_and_viewer_data(client: TestClient) -> None:
    headers = auth_headers(client)
    project_id = client.post(
        "/projects",
        json={"name": "Projeto Viewer", "client": "Cliente Demo"},
        headers=headers,
    ).json()["id"]

    ifc_content = (
        b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n"
        b"#10=IFCWALL('WALL_OK',$,'Parede OK',$,$,$,$,$);\n"
        b"#11=IFCWALL('WALL_FAIL',$,$,$,$,$,$,$);\nENDSEC;"
    )
    ifc_file_id = client.post(
        f"/projects/{project_id}/ifc/upload",
        files={"file": ("viewer.ifc", ifc_content, "application/octet-stream")},
        headers=headers,
    ).json()["id"]

    csv_content = (
        "codigo,nome,criticidade,tipo_regra,entidade_ifc,propriedade,operador,valor_esperado,ativo,mensagem_falha,sugestao_correcao\n"
        "IFC-PROP-001,Nome obrigatorio,alta,property_not_empty,IfcWall,Name,not_empty,,sim,Nome obrigatorio,Preencher Name do elemento\n"
    )
    criteria_set_id = client.post(
        "/criteria-sets/import",
        files={"file": ("criterios.csv", csv_content.encode("utf-8"), "text/csv")},
        headers=headers,
    ).json()["criteria_set"]["id"]

    audit_response = client.post(
        "/audits?mode=sync",
        json={
            "project_id": project_id,
            "ifc_file_id": ifc_file_id,
            "criteria_set_id": criteria_set_id,
        },
        headers=headers,
    )
    assert audit_response.status_code == 201

    audit_id = audit_response.json()["id"]
    results = client.get(f"/audits/{audit_id}/results", headers=headers).json()

    summary_rows = [row for row in results if row["is_summary"]]
    detail_rows = [row for row in results if not row["is_summary"]]
    assert len(summary_rows) == 1
    assert len(detail_rows) == 2
    assert any(row["status"] == "failed" and row["element_guid"] == "WALL_FAIL" for row in detail_rows)
    assert all("fix_suggestion" in row for row in detail_rows)

    viewer_response = client.get(f"/ifc-files/{ifc_file_id}/viewer-data", headers=headers)
    assert viewer_response.status_code == 200
    viewer_data = viewer_response.json()
    assert viewer_data["audit_run_id"] == audit_id
    assert viewer_data["status_map"]["WALL_FAIL"] == "failed"
    assert any(item["global_id"] == "WALL_FAIL" for item in viewer_data["elements"])

    geometry_response = client.get(f"/ifc-files/{ifc_file_id}/viewer-geometry", headers=headers)
    assert geometry_response.status_code == 200
    assert geometry_response.json()["ifc_file_id"] == ifc_file_id

    report_html = client.get(f"/audits/{audit_id}/report/html")
    assert report_html.status_code == 200
    assert "Relatorio de Auditoria IFC" in report_html.text
    assert "Resumo executivo" in report_html.text
    assert "Corrigir primeiro" in report_html.text
    assert "Detalhes por elemento" in report_html.text
    assert "Revisao necessaria antes de aprovar" in report_html.text

    report_pdf = client.get(f"/audits/{audit_id}/report/pdf")
    assert report_pdf.status_code == 200
    assert report_pdf.headers["content-type"] == "application/pdf"


def test_phase7_history_comparison_and_read_only_snapshots(client: TestClient) -> None:
    headers = auth_headers(client)
    project_id = client.post(
        "/projects",
        json={"name": "Projeto Historico", "client": "Cliente Demo"},
        headers=headers,
    ).json()["id"]

    first_ifc = (
        b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n"
        b"#10=IFCWALL('WALL_OK',$,'Parede OK',$,$,$,$,$);\n"
        b"#11=IFCWALL('WALL_FAIL',$,$,$,$,$,$,$);\nENDSEC;"
    )
    second_ifc = (
        b"ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n"
        b"#10=IFCWALL('WALL_OK',$,'Parede OK',$,$,$,$,$);\n"
        b"#11=IFCWALL('WALL_FAIL',$,'Parede corrigida',$,$,$,$,$);\nENDSEC;"
    )
    first_ifc_id = client.post(
        f"/projects/{project_id}/ifc/upload",
        files={"file": ("historico-01.ifc", first_ifc, "application/octet-stream")},
        headers=headers,
    ).json()["id"]
    second_ifc_id = client.post(
        f"/projects/{project_id}/ifc/upload",
        files={"file": ("historico-02.ifc", second_ifc, "application/octet-stream")},
        headers=headers,
    ).json()["id"]

    csv_content = (
        "codigo,nome,criticidade,tipo_regra,entidade_ifc,propriedade,operador,valor_esperado,ativo,mensagem_falha,sugestao_correcao\n"
        "IFC-PROP-001,Nome obrigatorio,alta,property_not_empty,IfcWall,Name,not_empty,,sim,Nome obrigatorio,Preencher Name do elemento\n"
    )
    criteria_set_id = client.post(
        "/criteria-sets/import",
        files={"file": ("criterios.csv", csv_content.encode("utf-8"), "text/csv")},
        headers=headers,
    ).json()["criteria_set"]["id"]

    first_audit = client.post(
        "/audits?mode=sync",
        json={
            "project_id": project_id,
            "ifc_file_id": first_ifc_id,
            "criteria_set_id": criteria_set_id,
        },
        headers=headers,
    ).json()
    second_audit = client.post(
        "/audits?mode=sync",
        json={
            "project_id": project_id,
            "ifc_file_id": second_ifc_id,
            "criteria_set_id": criteria_set_id,
        },
        headers=headers,
    ).json()

    history_response = client.get(f"/audits/project/{project_id}/history", headers=headers)
    assert history_response.status_code == 200
    history = history_response.json()
    assert [item["ifc_file_name"] for item in history] == ["historico-02.ifc", "historico-01.ifc"]
    assert history[0]["score_percent"] == 100
    assert history[1]["failed_criteria"] == 1

    comparison_response = client.get(
        f"/audits/compare?base_audit_id={first_audit['id']}&target_audit_id={second_audit['id']}",
        headers=headers,
    )
    assert comparison_response.status_code == 200
    comparison = comparison_response.json()
    assert comparison["score_delta"] > 0
    assert comparison["new_failures"] == []
    assert [item["element_guid"] for item in comparison["resolved_failures"]] == ["WALL_FAIL"]
    assert comparison["persistent_failures"] == []

    snapshot_response = client.post(
        f"/audits/{first_audit['id']}/snapshots",
        json={"expires_in_days": 30},
        headers=headers,
    )
    assert snapshot_response.status_code == 201
    snapshot = snapshot_response.json()
    assert snapshot["view_url"].startswith("/snapshots/")
    assert snapshot["report_html_url"].endswith("/report/html")

    snapshot_page = client.get(snapshot["view_url"])
    assert snapshot_page.status_code == 200
    assert first_audit["id"] in snapshot_page.text
    assert "historico-01.ifc" in snapshot_page.text
    assert "historico-02.ifc" not in snapshot_page.text

    snapshot_report = client.get(snapshot["report_html_url"])
    assert snapshot_report.status_code == 200
    assert "Relatorio de Auditoria IFC" in snapshot_report.text
    assert "WALL_FAIL" in snapshot_report.text

    invalid_snapshot = client.get("/snapshots/not-a-valid-token")
    assert invalid_snapshot.status_code == 404

    override_get_db = app.dependency_overrides[get_db]
    db_generator = override_get_db()
    db = next(db_generator)
    try:
        stored_snapshot = db.scalar(select(AuditSnapshot).where(AuditSnapshot.id == snapshot["id"]))
        assert stored_snapshot is not None
        stored_snapshot.expires_at = datetime.utcnow() - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()
        db_generator.close()

    expired_snapshot = client.get(snapshot["view_url"])
    assert expired_snapshot.status_code == 410
