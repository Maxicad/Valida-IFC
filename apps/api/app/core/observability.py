from __future__ import annotations

import json
import logging
import re
import time
from collections import defaultdict, deque
from contextvars import ContextVar
from datetime import datetime
from threading import Lock
from typing import Any
from uuid import uuid4

from fastapi import Request
from jose import JWTError, jwt
from redis.exceptions import RedisError

from app.core.config import settings

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_ctx: ContextVar[str | None] = ContextVar("user_id", default=None)
audit_id_ctx: ContextVar[str | None] = ContextVar("audit_id", default=None)


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(timespec="milliseconds") + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", None) or request_id_ctx.get(),
            "audit_id": getattr(record, "audit_id", None) or audit_id_ctx.get(),
            "user_id": getattr(record, "user_id", None) or user_id_ctx.get(),
        }
        for field in ("method", "path", "status_code", "elapsed_ms", "queue_depth", "duration_ms"):
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps({key: value for key, value in payload.items() if value is not None}, ensure_ascii=False)


def configure_logging() -> None:
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())
    root.handlers = [handler]


logger = logging.getLogger("valida_ifc_api")


class MetricsRegistry:
    def __init__(self) -> None:
        self._lock = Lock()
        self.http_requests: dict[tuple[str, str, int], int] = defaultdict(int)
        self.http_errors: dict[tuple[str, str, int], int] = defaultdict(int)
        self.http_duration_sum: dict[tuple[str, str], float] = defaultdict(float)
        self.http_duration_count: dict[tuple[str, str], int] = defaultdict(int)
        self.audit_total: dict[str, int] = defaultdict(int)
        self.audit_duration_sum: float = 0
        self.audit_duration_count: int = 0
        self.recent_api_errors: deque[dict[str, Any]] = deque(maxlen=25)
        self.recent_audit_failures: deque[dict[str, Any]] = deque(maxlen=25)

    def record_http_request(self, method: str, path: str, status_code: int, elapsed_ms: float) -> None:
        route = normalize_path(path)
        with self._lock:
            self.http_requests[(method, route, status_code)] += 1
            self.http_duration_sum[(method, route)] += elapsed_ms
            self.http_duration_count[(method, route)] += 1
            if status_code >= 500:
                self.http_errors[(method, route, status_code)] += 1
                self.recent_api_errors.append(
                    {
                        "method": method,
                        "path": path,
                        "status_code": status_code,
                        "request_id": request_id_ctx.get(),
                        "elapsed_ms": elapsed_ms,
                    }
                )

    def record_audit_completed(self, audit_id: str, status: str, duration_ms: float) -> None:
        with self._lock:
            self.audit_total[status] += 1
            self.audit_duration_sum += duration_ms
            self.audit_duration_count += 1
            if status == "failed":
                self.recent_audit_failures.append(
                    {
                        "audit_id": audit_id,
                        "request_id": request_id_ctx.get(),
                        "user_id": user_id_ctx.get(),
                        "duration_ms": duration_ms,
                    }
                )

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "http_requests": dict(self.http_requests),
                "http_errors": dict(self.http_errors),
                "http_duration_sum": dict(self.http_duration_sum),
                "http_duration_count": dict(self.http_duration_count),
                "audit_total": dict(self.audit_total),
                "audit_duration_sum": self.audit_duration_sum,
                "audit_duration_count": self.audit_duration_count,
                "recent_api_errors": list(self.recent_api_errors),
                "recent_audit_failures": list(self.recent_audit_failures),
            }


metrics = MetricsRegistry()


def normalize_path(path: str) -> str:
    path = re.sub(r"/[0-9a-fA-F-]{32,36}(?=/|$)", "/{id}", path)
    return re.sub(r"/[^/]{18,}(?=/|$)", "/{id}", path)


def user_id_from_request(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    subject = payload.get("sub")
    return subject if isinstance(subject, str) else None


def audit_id_from_path(path: str) -> str | None:
    match = re.search(r"/audits/([^/]+)", path)
    return match.group(1) if match else None


async def request_observability_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or str(uuid4())
    user_id = user_id_from_request(request)
    audit_id = request.headers.get("X-Audit-Id") or audit_id_from_path(request.url.path)
    request_id_token = request_id_ctx.set(request_id)
    user_id_token = user_id_ctx.set(user_id)
    audit_id_token = audit_id_ctx.set(audit_id)
    start = time.perf_counter()
    status_code = 500

    try:
        response = await call_next(request)
        status_code = response.status_code
        response.headers["X-Request-Id"] = request_id
        return response
    except Exception:
        logger.exception(
            "api_request_failed",
            extra={"method": request.method, "path": request.url.path, "status_code": status_code},
        )
        raise
    finally:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        metrics.record_http_request(request.method, request.url.path, status_code, elapsed_ms)
        logger.info(
            "api_request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "elapsed_ms": elapsed_ms,
            },
        )
        request_id_ctx.reset(request_id_token)
        user_id_ctx.reset(user_id_token)
        audit_id_ctx.reset(audit_id_token)


def prometheus_metrics() -> str:
    snapshot = metrics.snapshot()
    lines = [
        "# HELP valida_ifc_http_requests_total Total HTTP requests.",
        "# TYPE valida_ifc_http_requests_total counter",
    ]
    for (method, route, status_code), value in sorted(snapshot["http_requests"].items()):
        lines.append(
            f'valida_ifc_http_requests_total{{method="{method}",route="{route}",status_code="{status_code}"}} {value}'
        )

    lines.extend(
        [
            "# HELP valida_ifc_http_request_duration_ms_sum Total HTTP request duration in milliseconds.",
            "# TYPE valida_ifc_http_request_duration_ms_sum counter",
        ]
    )
    for (method, route), value in sorted(snapshot["http_duration_sum"].items()):
        lines.append(f'valida_ifc_http_request_duration_ms_sum{{method="{method}",route="{route}"}} {value}')
    for (method, route), value in sorted(snapshot["http_duration_count"].items()):
        lines.append(f'valida_ifc_http_request_duration_ms_count{{method="{method}",route="{route}"}} {value}')

    lines.extend(
        [
            "# HELP valida_ifc_audit_runs_total Total audit runs by status.",
            "# TYPE valida_ifc_audit_runs_total counter",
        ]
    )
    for status, value in sorted(snapshot["audit_total"].items()):
        lines.append(f'valida_ifc_audit_runs_total{{status="{status}"}} {value}')
    lines.append(f"valida_ifc_audit_duration_ms_sum {snapshot['audit_duration_sum']}")
    lines.append(f"valida_ifc_audit_duration_ms_count {snapshot['audit_duration_count']}")
    lines.extend(queue_metrics_lines())
    return "\n".join(lines) + "\n"


def queue_metrics_lines() -> list[str]:
    lines = [
        "# HELP valida_ifc_queue_depth Current audit queue depth.",
        "# TYPE valida_ifc_queue_depth gauge",
    ]
    try:
        from app.core.queue import get_audit_queue

        queue = get_audit_queue()
        lines.append(f'valida_ifc_queue_depth{{queue="{settings.audit_queue_name}"}} {len(queue)}')
        failed_count = queue.failed_job_registry.count
        lines.append(f'valida_ifc_queue_failed_jobs{{queue="{settings.audit_queue_name}"}} {failed_count}')
    except (RedisError, Exception):
        lines.append(f'valida_ifc_queue_depth{{queue="{settings.audit_queue_name}",state="unavailable"}} -1')
        lines.append(f'valida_ifc_queue_failed_jobs{{queue="{settings.audit_queue_name}",state="unavailable"}} -1')
    return lines


def active_alerts() -> list[dict[str, Any]]:
    snapshot = metrics.snapshot()
    alerts: list[dict[str, Any]] = []
    api_5xx_count = sum(snapshot["http_errors"].values())
    if api_5xx_count >= settings.alert_api_5xx_threshold:
        alerts.append(
            {
                "name": "api_5xx_errors",
                "severity": "critical",
                "count": api_5xx_count,
                "recent": snapshot["recent_api_errors"],
            }
        )

    audit_failures = snapshot["audit_total"].get("failed", 0)
    if audit_failures >= settings.alert_audit_failure_threshold:
        alerts.append(
            {
                "name": "audit_failures",
                "severity": "critical",
                "count": audit_failures,
                "recent": snapshot["recent_audit_failures"],
            }
        )

    try:
        from app.core.queue import get_audit_queue

        queue = get_audit_queue()
        queue_depth = len(queue)
        if queue_depth >= settings.alert_queue_depth_threshold:
            alerts.append(
                {
                    "name": "audit_queue_depth",
                    "severity": "warning",
                    "queue": settings.audit_queue_name,
                    "depth": queue_depth,
                }
            )
        failed_jobs = queue.failed_job_registry.count
        if failed_jobs >= settings.alert_audit_failure_threshold:
            alerts.append(
                {
                    "name": "audit_queue_failed_jobs",
                    "severity": "critical",
                    "queue": settings.audit_queue_name,
                    "count": failed_jobs,
                }
            )
    except (RedisError, Exception):
        alerts.append(
            {
                "name": "audit_queue_unavailable",
                "severity": "warning",
                "queue": settings.audit_queue_name,
            }
        )
    return alerts
