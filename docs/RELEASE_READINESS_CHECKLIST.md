# Release Readiness Checklist - Valida IFC

Last update: 2026-05-24
Owner: Product + Engineering
Status: Technical release evidence is ready; not ready for production go-live until stakeholder sign-off and support rotation names are complete.

## Scope

This checklist is the release gate for infra, data, backup and rollback. It is intentionally lean: every item must either be verified by a command, a reviewed configuration, or a named operational owner.

## Infrastructure

- [x] Local compose topology exists for app, API, worker, Postgres and Redis.
- [x] E2E compose topology boots API, worker, Postgres and Redis for acceptance-like validation.
- [x] Health endpoint exists: `GET /health`.
- [x] Metrics endpoint exists: `GET /metrics`.
- [x] Alert endpoint exists: `GET /alerts`.
- [x] Worker failure state is surfaced through queue/audit alerts.
- [ ] Production/staging hostnames, TLS certificates and reverse proxy settings reviewed.
- [ ] Production/staging secrets injected outside version control.
- [x] Staging-equivalent release dry-run executed with fresh local build.
  - Evidence: `docs/evidence/phase9-2026-05-24/rollback-dry-run/RESULTS.md`.

## Data

- [x] Alembic migrations cover current schema through `20260524_0004_audit_snapshots`.
- [x] Uploaded IFC retention cleanup is implemented and covered by backend tests.
- [x] Audit results, viewer data and reports are persisted for traceability.
- [x] Read-only snapshots support controlled sharing.
- [ ] Data retention policy approved by stakeholders for pilot and production.
- [x] Real pilot IFC selected and copied for controlled acceptance evidence.
- [ ] Pilot project data classification approved for production retention.

## Backup

- [x] Staging-equivalent database backup generated during rollback dry-run.
  - Evidence: `docs/evidence/phase9-2026-05-24/rollback-dry-run/06-postgres-backup-before-rollback.sql`.
- [ ] Production/staging database backup job configured and restored once.
- [ ] Production database backup schedule approved.
- [ ] Uploaded IFC/report storage backup target approved.
- [ ] Backup retention period approved.
- [ ] Restore runbook tested with one database dump and one stored IFC/report artifact.

## Rollback

- [x] Release can be blocked by the mandatory validation gate documented in `PROJECT_CONTROL_CHECKLIST.md`.
- [x] E2E environment can be torn down with `docker compose -f docker-compose.e2e.yml --project-name valida-ifc-e2e down -v --remove-orphans`.
- [x] Staging-equivalent rollback dry-run executed by stopping release candidate, recreating target stack and validating health/alerts.
  - Evidence: `docs/evidence/phase9-2026-05-24/rollback-dry-run/RESULTS.md`.
- [ ] Registry-backed rollback to previous production/staging image tag validated.
- [ ] Database rollback strategy approved for forward-only migrations or point-in-time restore.
- [ ] User-facing rollback communication drafted.

## Go/No-Go Criteria

GO requires all of the following:

- Backend tests pass.
- Frontend lint, typecheck and build pass.
- Full E2E flow passes on desktop and mobile.
- Real pilot project automated acceptance test passes.
- Google login for Alfa onboarding passes on desktop and mobile.
- Interface UAT is signed by Product and one pilot stakeholder.
- Staging-equivalent dry-run release and rollback complete.
- Monitoring plan has named primary and backup owners for the first support rotation.

Current decision: NO-GO for production until the values listed in `docs/PRODUCTION_GO_BLOCKER_RESOLUTION.md` are filled with real names and approval channel.
