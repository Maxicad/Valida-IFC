# Phase 9 Evidence - Release Readiness

Date: 2026-05-24
Sign-off update: 2026-05-26
Timezone: America/Sao_Paulo
Commit: df2cd77
Owner: Product + Engineering
Decision: GO with conditions for pilot/Alfa; expanded production use pending interface adjustments and production dashboard/alert wiring.

## Completed in this update

- Finalized release readiness checklist covering infra, data, backup and rollback: `docs/RELEASE_READINESS_CHECKLIST.md`.
- Closed the user guide path for "auditoria rapida": `docs/USER_GUIDE_QUICK_AUDIT.md`.
- Defined post-go-live monitoring and support rotation plan: `docs/POST_GO_LIVE_MONITORING.md`.
- Prepared stakeholder sign-off register: `docs/SIGN_OFF_REGISTER.md`.
- Updated project control checklist and HTML status dashboard.
- Copied real pilot IFC from shared drive to `samples/ifc/SALE-MET-EX-9001-TOR1-GERL-R01.ifc`.
- Added reusable Playwright pilot acceptance spec: `apps/web/e2e/pilot-acceptance.spec.ts`.
- Implemented and validated Google login for Alfa onboarding.

## Validation executed

- `docker compose run --rm --no-deps api pytest apps/api/tests -q`
  - Result: passed, 27 tests.
  - Google login coverage: user creation, internal JWT issuance, verified e-mail requirement and password-login rejection for Google-only account.
- `corepack pnpm --filter @valida-ifc/web lint`
  - Result: passed.
- `corepack pnpm --filter @valida-ifc/web typecheck`
  - Result: passed.
- `corepack pnpm --filter @valida-ifc/web build`
  - Result: passed.
- `corepack pnpm e2e`
  - Result: passed, 6 tests; conditional Google/pilot specs skipped without required env vars.
  - Covered desktop and mobile full flow: registro/login -> projeto -> upload IFC -> criterios -> auditoria -> viewer -> relatorio.
  - Covered IDS MVP import -> auditoria -> guia de correcao visivel.
  - Covered visual regression core screens on desktop and mobile.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-alpha-client corepack pnpm --filter @valida-ifc/web e2e e2e/google-login.spec.ts --project chromium-desktop`
  - Result: passed, 1 test.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-alpha-client corepack pnpm --filter @valida-ifc/web e2e e2e/google-login.spec.ts --project chromium-mobile`
  - Result: passed, 1 test.
- Google login evidence artifact: `docs/evidence/phase9-2026-05-24/google-login/RESULTS.md`.
- `PILOT_IFC_PATH=C:\MaxiCAD_Projetos_IA\Valida-IFC\samples\ifc\SALE-MET-EX-9001-TOR1-GERL-R01.ifc corepack pnpm --filter @valida-ifc/web e2e e2e/pilot-acceptance.spec.ts`
  - Result: passed, 2 tests.
  - Covered real IFC upload, criteria import, auditoria rapida, completed async audit, viewer and HTML report.
  - Covered chromium desktop and chromium mobile.
- `ASYNC_VERIFY_API_BASE_URL=http://127.0.0.1:8001 py apps/api/scripts/verify_async_worker_flow.py`
  - Result: passed during rollback dry-run.
  - Completed audit and injected failed audit were both persisted with expected final states.

## Rollback dry-run

- Environment: local staging-equivalent Docker Compose project `valida-ifc-staging`.
- Release candidate health: `ok`.
- Database backup generated before rollback: `docs/evidence/phase9-2026-05-24/rollback-dry-run/06-postgres-backup-before-rollback.sql`.
- Rollback target health: `ok`.
- Post-rollback alerts: `ok` with no active alerts.
- Evidence artifact: `docs/evidence/phase9-2026-05-24/rollback-dry-run/RESULTS.md`.

## Real pilot IFC

- Source: `H:\Drives compartilhados\MaxiCAD Projetos\IFCMaxi\00 - Modelos BIM\SALE-MET-EX-9001-TOR1-GERL-R01.ifc`.
- Local evidence copy: `samples/ifc/SALE-MET-EX-9001-TOR1-GERL-R01.ifc`.
- Size: 1,888,076 bytes.
- Header schema: `IFC2X3`.
- Screenshot evidence: `docs/evidence/phase9-2026-05-24/pilot-acceptance/`.

## Blockers for production GO

- Stakeholder sign-off was recorded on 2026-05-26 as GO with conditions:
  - Product owner: Adriano - MaxiCAD.
  - BIM/domain stakeholder: Adriano - MaxiCAD.
  - Engineering release owner: MaxiCAD.
  - Operations/support owner: Equipe MaxiCAD.
- Support rotation was named on 2026-05-26:
  - Engineering on-call: Equipe MaxiCAD / Equipe MaxiCAD.
  - Product/BIM support: Equipe MaxiCAD / Equipe MaxiCAD.
  - Stakeholder contact: Adriano - MaxiCAD / Equipe MaxiCAD.
  - Incident notification channel: `suporte@maxicad.com.br`.
  - 72-hour monitoring owner: Equipe MaxiCAD.
- Open condition: interface adjustments remain pending before expanding use.
- External production-like staging details remain a deployment risk to confirm with the production environment owner: hostnames, TLS, secrets, dashboards/alerts and image registry rollback.

## Next required evidence

1. Triage, prioritize and validate the pending interface adjustments before expanded use.
2. Connect production dashboards/alerts and confirm the notification flow through `suporte@maxicad.com.br`.
3. Validate external production-like staging details with the production environment owner: hostnames, TLS, secrets and image registry rollback.
