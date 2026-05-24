from __future__ import annotations

import json
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib import error, request


API_BASE_URL = os.environ.get("API_BASE_URL", "http://127.0.0.1:8001")
CONCURRENCY = int(os.environ.get("PHASE8_LOAD_CONCURRENCY", "4"))


def request_json(method: str, path: str, payload: dict | None = None, token: str | None = None) -> dict:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    api_request = request.Request(f"{API_BASE_URL}{path}", data=body, method=method, headers=headers)
    try:
        with request.urlopen(api_request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise AssertionError(f"{method} {path} failed with {exc.code}: {detail}") from exc


def request_text(path: str, token: str | None = None) -> str:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    api_request = request.Request(f"{API_BASE_URL}{path}", method="GET", headers=headers)
    with request.urlopen(api_request, timeout=30) as response:
        return response.read().decode("utf-8")


def upload_file(path: str, field_name: str, file_name: str, content: bytes, token: str) -> dict:
    boundary = f"----valida-ifc-{uuid.uuid4().hex}"
    body = b"\r\n".join(
        [
            f"--{boundary}".encode(),
            f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"'.encode(),
            b"Content-Type: application/octet-stream",
            b"",
            content,
            f"--{boundary}--".encode(),
            b"",
        ]
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }
    api_request = request.Request(f"{API_BASE_URL}{path}", data=body, method="POST", headers=headers)
    try:
        with request.urlopen(api_request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise AssertionError(f"upload {path} failed with {exc.code}: {detail}") from exc


def register_and_login() -> str:
    suffix = uuid.uuid4().hex[:10]
    email = f"phase8.{suffix}@example.com"
    password = "secret123"
    request_json(
        "POST",
        "/auth/register",
        {
            "name": "Phase 8 Load Smoke",
            "email": email,
            "password": password,
            "role": "auditor_bim",
        },
    )
    login = request_json("POST", "/auth/login", {"email": email, "password": password})
    return login["access_token"]


def import_criteria(token: str) -> str:
    csv_content = (
        "codigo,nome,criticidade,tipo_regra,entidade_ifc,propriedade,operador,valor_esperado,ativo\n"
        "LOAD-001,Nome obrigatorio,alta,property_not_empty,IfcWall,Name,not_empty,,sim\n"
    ).encode("utf-8")
    response = upload_file("/criteria-sets/import", "file", "phase8-load.csv", csv_content, token)
    assert response["imported_count"] == 1
    return response["criteria_set"]["id"]


def ifc_payload(index: int) -> bytes:
    return (
        "ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n"
        f"#10=IFCWALL('LOAD_OK_{index}',$,'Parede {index}',$,$,$,$,$);\n"
        f"#11=IFCWALL('LOAD_FAIL_{index}',$,$,$,$,$,$,$);\n"
        "ENDSEC;"
    ).encode("utf-8")


def poll_audit(audit_id: str, token: str, timeout_seconds: int = 90) -> dict:
    deadline = time.time() + timeout_seconds
    last_status: dict | None = None
    while time.time() < deadline:
        last_status = request_json("GET", f"/audits/{audit_id}/status", token=token)
        if last_status["status"] in {"completed", "failed"}:
            return last_status
        time.sleep(1)
    raise AssertionError(f"Audit {audit_id} did not finish; last status={last_status}")


def main() -> None:
    started_at = time.perf_counter()
    token = register_and_login()
    project = request_json(
        "POST",
        "/projects",
        {"name": f"Phase 8 Load {uuid.uuid4().hex[:8]}", "client": "QA"},
        token=token,
    )
    criteria_set_id = import_criteria(token)

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        upload_futures = [
            executor.submit(
                upload_file,
                f"/projects/{project['id']}/ifc/upload",
                "file",
                f"phase8-load-{index}.ifc",
                ifc_payload(index),
                token,
            )
            for index in range(CONCURRENCY)
        ]
        ifc_files = [future.result() for future in as_completed(upload_futures)]

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        audit_futures = [
            executor.submit(
                request_json,
                "POST",
                "/audits?mode=async",
                {
                    "project_id": project["id"],
                    "ifc_file_id": ifc_file["id"],
                    "criteria_set_id": criteria_set_id,
                },
                token,
            )
            for ifc_file in ifc_files
        ]
        audits = [future.result() for future in as_completed(audit_futures)]

    statuses = [poll_audit(audit["id"], token) for audit in audits]
    failed_statuses = [status for status in statuses if status["status"] != "completed"]
    if failed_statuses:
        raise AssertionError(f"Expected completed audits, got {failed_statuses}")

    metrics = request_text("/metrics")
    alerts = request_json("GET", "/alerts")
    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
    result = {
        "concurrency": CONCURRENCY,
        "uploads": len(ifc_files),
        "async_audits": len(audits),
        "completed_audits": len(statuses),
        "elapsed_ms": elapsed_ms,
        "metrics_include_audits": "valida_ifc_audit_runs_total" in metrics,
        "alerts_status": alerts["status"],
        "alert_names": [item["name"] for item in alerts["alerts"]],
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
