from __future__ import annotations

import json
import os
import re
import time
import uuid
from pathlib import Path
from urllib import request
from urllib.error import HTTPError


API_BASE_URL = os.getenv("ASYNC_VERIFY_API_BASE_URL", "http://127.0.0.1:8001")
FIXTURES_DIR = Path(__file__).resolve().parents[3] / "apps" / "web" / "e2e" / "fixtures"


def api_json(method: str, path: str, payload: dict | None = None, token: str | None = None) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(API_BASE_URL + path, data=data, headers=headers, method=method)
    with request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def api_multipart(
    path: str,
    *,
    field_name: str,
    file_name: str,
    content: bytes,
    token: str,
    content_type: str = "application/octet-stream",
) -> dict:
    boundary = f"----valida-ifc-{uuid.uuid4().hex}"
    body = b"".join(
        [
            f"--{boundary}\r\n".encode("utf-8"),
            f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'.encode("utf-8"),
            f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
            content,
            b"\r\n",
            f"--{boundary}--\r\n".encode("utf-8"),
        ]
    )
    req = request.Request(
        API_BASE_URL + path,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    with request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def poll_status(audit_id: str, token: str, expected: set[str], timeout_seconds: int = 60) -> dict:
    deadline = time.time() + timeout_seconds
    last_status: dict = {}
    while time.time() < deadline:
        last_status = api_json("GET", f"/audits/{audit_id}/status", token=token)
        if last_status["status"] in expected:
            return last_status
        time.sleep(0.5)
    raise AssertionError(f"Audit {audit_id} did not reach {expected}; last status={last_status}")


def assert_queue_failed_job_recorded(timeout_seconds: int = 20) -> None:
    deadline = time.time() + timeout_seconds
    last_value = 0.0
    metric_seen = False
    while time.time() < deadline:
        metrics_req = request.Request(API_BASE_URL + "/metrics", method="GET")
        with request.urlopen(metrics_req, timeout=20) as response:
            metrics_text = response.read().decode("utf-8")
        match = re.search(r'valida_ifc_queue_failed_jobs\{queue="ifc_audits"\} ([0-9.]+)', metrics_text)
        if match:
            metric_seen = True
            last_value = float(match.group(1))
            if last_value >= 1:
                return
        time.sleep(0.5)

    if not metric_seen:
        raise AssertionError("Queue failed jobs metric was not exported.")
    raise AssertionError(f"Expected at least one failed RQ job in failed job registry; last value={last_value}.")


def create_session() -> str:
    suffix = uuid.uuid4().hex[:8]
    email = f"async.verify.{suffix}@example.com"
    api_json(
        "POST",
        "/auth/register",
        {
            "name": "Async Verifier",
            "email": email,
            "password": "secret123",
            "role": "auditor_bim",
        },
    )
    login = api_json("POST", "/auth/login", {"email": email, "password": "secret123"})
    return login["access_token"]


def create_project_and_file(token: str) -> tuple[str, str]:
    project = api_json(
        "POST",
        "/projects",
        {"name": f"Projeto Async {uuid.uuid4().hex[:8]}", "client": "Cliente E2E"},
        token=token,
    )
    ifc_bytes = (FIXTURES_DIR / "modelo-e2e.ifc").read_bytes()
    ifc_file = api_multipart(
        f"/projects/{project['id']}/ifc/upload",
        field_name="file",
        file_name="modelo-e2e.ifc",
        content=ifc_bytes,
        token=token,
    )
    return project["id"], ifc_file["id"]


def import_criteria(token: str, csv_text: str, name: str) -> str:
    imported = api_multipart(
        "/criteria-sets/import",
        field_name="file",
        file_name=name,
        content=csv_text.encode("utf-8"),
        token=token,
        content_type="text/csv",
    )
    return imported["criteria_set"]["id"]


def create_async_audit(token: str, project_id: str, ifc_file_id: str, criteria_set_id: str) -> dict:
    audit = api_json(
        "POST",
        "/audits?mode=async",
        {
            "project_id": project_id,
            "ifc_file_id": ifc_file_id,
            "criteria_set_id": criteria_set_id,
        },
        token=token,
    )
    if audit["status"] != "pending":
        raise AssertionError(f"Expected pending audit response, got {audit}")
    if not audit.get("queue_job_id"):
        raise AssertionError(f"Expected queue_job_id in async audit response, got {audit}")
    return audit


def main() -> None:
    token = create_session()
    project_id, ifc_file_id = create_project_and_file(token)

    good_criteria_id = import_criteria(
        token,
        "codigo,nome,criticidade,tipo_regra,entidade_ifc,propriedade,operador,valor_esperado,ativo\n"
        "IFC-001,Versao minima IFC,alta,ifc_schema,,FILE_SCHEMA,in,IFC4|IFC4X3,sim\n",
        "criterios-ok.csv",
    )
    completed_audit = create_async_audit(token, project_id, ifc_file_id, good_criteria_id)
    completed_status = poll_status(completed_audit["id"], token, {"completed"})
    results = api_json("GET", f"/audits/{completed_audit['id']}/results", token=token)
    if not results:
        raise AssertionError("Completed audit did not persist result rows.")

    bad_criteria_id = import_criteria(
        token,
        "codigo,nome,criticidade,tipo_regra,entidade_ifc,propriedade,operador,valor_esperado,ativo\n"
        "IFC-BAD,Contagem invalida,alta,entity_count_min,IfcProject,,min,not-a-number,sim\n",
        "criterios-falha.csv",
    )
    failed_audit = create_async_audit(token, project_id, ifc_file_id, bad_criteria_id)
    failed_status = poll_status(failed_audit["id"], token, {"failed"})
    if not failed_status.get("error_message"):
        raise AssertionError(f"Failed audit did not persist error_message: {failed_status}")
    assert_queue_failed_job_recorded()

    print(
        json.dumps(
            {
                "status": "ok",
                "completed_audit_id": completed_audit["id"],
                "completed_queue_job_id": completed_audit["queue_job_id"],
                "completed_final_status": completed_status["status"],
                "failed_audit_id": failed_audit["id"],
                "failed_queue_job_id": failed_audit["queue_job_id"],
                "failed_final_status": failed_status["status"],
                "failed_error_message": failed_status["error_message"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc
