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
        "/audits",
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
        "/audits",
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
