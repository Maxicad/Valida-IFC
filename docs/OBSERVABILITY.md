# Observability - Valida IFC

Last update: 2026-05-23

## Correlation model

The API emits structured JSON logs with these correlation fields:

- `request_id`: accepted from `X-Request-Id` or generated per request.
- `user_id`: extracted from the authenticated JWT when present.
- `audit_id`: extracted from audit routes, `X-Audit-Id`, or the audit worker context.

Every API response includes `X-Request-Id`, so an incident can be followed from browser evidence to API logs and audit execution logs.

## Endpoints

- `GET /metrics`: Prometheus-compatible text metrics for API requests, API duration, API errors, audit duration, audit failures and queue health.
- `GET /alerts`: JSON alert state for queue unavailable, queue depth threshold, API 5xx threshold and audit failure threshold.
- `GET /health`: basic service health.

## Alert thresholds

Configured through environment variables:

- `ALERT_QUEUE_DEPTH_THRESHOLD`
- `ALERT_API_5XX_THRESHOLD`
- `ALERT_AUDIT_FAILURE_THRESHOLD`

## Incident drill

1. Capture the browser screenshot/trace from `test-results/e2e`.
2. Read the failing response `X-Request-Id`.
3. Search API logs by `request_id`.
4. If the incident is audit-related, continue with `audit_id`.
5. Check `/metrics` for failure counters and queue state.
6. Check `/alerts` for active incident signals.

Local E2E intentionally uses a non-production Redis URL when the worker is not available; this keeps the browser flow reproducible while proving that queue health is visible through `/alerts`.
