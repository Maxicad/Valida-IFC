# Phase 9 Rollback Dry-Run Evidence

Date: 2026-05-24
Timezone: America/Sao_Paulo
Environment: local staging-equivalent Docker Compose project `valida-ifc-staging`
Decision: PASS for rollback dry-run evidence; production GO still requires stakeholder sign-off and named support rotation.

## Scope

The dry-run validated a release candidate start, health check, database backup, API/worker smoke, environment stop/recreate as rollback target, and post-rollback health/alerts check.

This was executed against the repository staging-equivalent stack because no external staging hostname, credentials or deployment target are configured in the repository.

## Commands Executed

- `docker compose -f docker-compose.e2e.yml --project-name valida-ifc-staging down -v --remove-orphans`
- `docker compose -f docker-compose.e2e.yml --project-name valida-ifc-staging up --build -d postgres redis api worker`
- `GET http://127.0.0.1:8001/health`
- `docker compose -f docker-compose.e2e.yml --project-name valida-ifc-staging exec -T postgres pg_dump -U valida_ifc -d valida_ifc_e2e`
- `ASYNC_VERIFY_API_BASE_URL=http://127.0.0.1:8001 py apps/api/scripts/verify_async_worker_flow.py`
- `docker compose -f docker-compose.e2e.yml --project-name valida-ifc-staging down --remove-orphans`
- `docker compose -f docker-compose.e2e.yml --project-name valida-ifc-staging up -d postgres redis api worker`
- `GET http://127.0.0.1:8001/health`
- `GET http://127.0.0.1:8001/alerts`

## Evidence Files

- `00-start.txt`: run start timestamp.
- `02-up-release-candidate.log`: release candidate build/start log.
- `03-health-release-candidate.json`: release candidate health response.
- `04-ps-release-candidate.log`: release candidate container status.
- `05-logs-release-candidate.log`: release candidate API/worker logs.
- `06-postgres-backup-before-rollback.sql`: database backup before rollback.
- `07-backup-metadata.txt`: backup file metadata.
- `08-async-worker-smoke-before-rollback.log`: API/worker smoke result.
- `09-stop-release-candidate.log`: stop/recreate start of rollback operation.
- `10-up-rollback-target.log`: rollback target start log.
- `11-health-rollback-target.json`: rollback target health response.
- `12-ps-rollback-target.log`: rollback target container status.
- `13-alerts-after-rollback.json`: post-rollback alert state.
- `14-logs-rollback-target.log`: rollback target API/worker logs.
- `15-finished.txt`: run finish timestamp.

## Key Results

- Release candidate API health: `ok`.
- Release candidate containers: Postgres healthy, Redis healthy, API healthy, worker running.
- Database backup generated: `06-postgres-backup-before-rollback.sql` with 33,786 bytes.
- Worker smoke passed:
  - completed audit: `9d2918b9-b6c2-43bf-8883-165082199445`;
  - completed queue job: `6063069e-a461-470b-b9b5-c8cb5d559aff`;
  - injected failed audit: `21100059-ba79-46bf-baab-6451676b9333`;
  - failed queue job: `3af39491-fa55-49db-be2b-dffd012cca9e`;
  - failed status and error message persisted as expected.
- Rollback target API health: `ok`.
- Post-rollback alerts: `ok` with no active alerts.

## Limitations

- This validates the repository staging-equivalent environment, not an external production-like staging host.
- It does not prove TLS, DNS, secret injection or image registry rollback because those deployment details are not configured in the repository.
- It does not replace formal stakeholder GO approval.
