# Post-Go-Live Monitoring and Support Rotation - Valida IFC

Last update: 2026-05-26
Status: Monitoring plan defined and support rotation named for pilot/Alfa. Expanded production use remains conditional on interface adjustments and production deployment wiring.

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
| Engineering on-call | Equipe MaxiCAD | Equipe MaxiCAD | Owns API, worker, infra and rollback. |
| Product/BIM support | Equipe MaxiCAD | Equipe MaxiCAD | Owns pilot user triage and acceptance notes. |
| Stakeholder contact | Adriano - MaxiCAD | Equipe MaxiCAD | Owns go/no-go feedback and sign-off. |

## Required activation values

| Required value | Status |
| --- | --- |
| Engineering on-call primary | Equipe MaxiCAD |
| Engineering on-call backup | Equipe MaxiCAD |
| Product/BIM support primary | Equipe MaxiCAD |
| Product/BIM support backup | Equipe MaxiCAD |
| Stakeholder contact primary | Adriano - MaxiCAD |
| Stakeholder contact backup | Equipe MaxiCAD |
| Notification channel for incidents and go-live updates | `suporte@maxicad.com.br` |
| First 72-hour monitoring calendar owner | Equipe MaxiCAD |

## Activation checklist

- [x] Monitoring endpoints and incident drill documented.
- [x] Alert thresholds are configurable through environment variables.
- [x] Queue/audit failure visibility validated in previous phase evidence.
- [x] Named support rotation approved.
- [x] Notification channel selected.
- [x] First 72-hour monitoring owner named.
- [ ] Production dashboards/alerts connected to deployment environment.

Current operational state: active for pilot/Alfa readiness tracking. The named support rotation is defined; production deployment dashboards/alerts still need to be connected in the target environment.

## Fast fill to activate rotation

Provide these values to activate support rotation and clear the production blocker:

- Engineering on-call primary and backup names: Equipe MaxiCAD / Equipe MaxiCAD.
- Product/BIM support primary and backup names: Equipe MaxiCAD / Equipe MaxiCAD.
- Stakeholder contact primary and backup names: Adriano - MaxiCAD / Equipe MaxiCAD.
- Incident notification channel: `suporte@maxicad.com.br`.
- 72-hour monitoring calendar owner: Equipe MaxiCAD.
