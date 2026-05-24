# Post-Go-Live Monitoring and Support Rotation - Valida IFC

Last update: 2026-05-24
Status: Monitoring plan defined; first support rotation and notification channel require named confirmation before production go-live.

## Monitoring sources

- `GET /health`: service availability.
- `GET /metrics`: request volume, latency, errors, audit duration, audit failures and queue health.
- `GET /alerts`: queue unavailable, queue depth threshold, API 5xx threshold and audit failure threshold.
- API structured logs: correlate incidents by `request_id`, `user_id` and `audit_id`.
- Worker logs: audit execution state, completed jobs and failed jobs.

## First 72 hours after go-live

- Check `/health`, `/metrics` and `/alerts` at start, middle and end of each business day.
- Review failed audit count and queue depth after every pilot batch.
- For each incident, record `request_id`, `audit_id`, time window, user action and resolution.
- Keep daily release notes with known issues, mitigations and user-facing impact.

## Alert response

| Signal | Severity | First response | Escalation |
| --- | --- | --- | --- |
| API unavailable | Critical | Check container/process status and reverse proxy | Engineering owner |
| Queue unavailable | Critical | Check Redis and worker connectivity | Engineering owner |
| Queue depth above threshold | High | Check worker throughput and blocked jobs | Engineering + Product |
| Audit failures above threshold | High | Inspect failed audit ids and input model/criteria | BIM support + Engineering |
| API 5xx above threshold | High | Correlate logs by `request_id` | Engineering owner |

## Support rotation

| Role | Primary | Backup | Notes |
| --- | --- | --- | --- |
| Engineering on-call | TBD | TBD | Owns API, worker, infra and rollback. |
| Product/BIM support | TBD | TBD | Owns pilot user triage and acceptance notes. |
| Stakeholder contact | TBD | TBD | Owns go/no-go feedback and sign-off. |

## Required activation values

| Required value | Status |
| --- | --- |
| Engineering on-call primary | Missing |
| Engineering on-call backup | Missing |
| Product/BIM support primary | Missing |
| Product/BIM support backup | Missing |
| Stakeholder contact primary | Missing |
| Stakeholder contact backup | Missing |
| Notification channel for incidents and go-live updates | Missing |
| First 72-hour monitoring calendar owner | Missing |

## Activation checklist

- [x] Monitoring endpoints and incident drill documented.
- [x] Alert thresholds are configurable through environment variables.
- [x] Queue/audit failure visibility validated in previous phase evidence.
- [ ] Named support rotation approved.
- [ ] Notification channel selected.
- [ ] First 72-hour monitoring calendar created.
- [ ] Production dashboards/alerts connected to deployment environment.

Current operational state: active for pilot readiness tracking, pending named rotation and production deployment wiring.
