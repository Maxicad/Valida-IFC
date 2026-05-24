# Phase 7 - Lightweight collaboration and project history

Date: 2026-05-24
Owner: Codex + Engineering
Decision: GO

## Implemented scope

- Tokenized read-only snapshots per completed audit/report.
- Public snapshot and snapshot-report HTML views by token, without login.
- Snapshot token hash persistence, expiration and invalid-token handling.
- Project audit timeline with run date, score, approved/failed criteria, IFC file and criteria set.
- Comparison between two runs on the same project: new, resolved and persistent failures.
- Minimal collaboration model for MVP: read-only evidence sharing only.
- Deterministic corrected IFC fixture for run-history comparison.
- Pixel-baseline visual regression for dashboard, audits and reports screens on desktop/mobile.

## Validation

- GO: `docker compose run --rm --no-deps api pytest apps/api/tests -q`
  - Result: 19 passed.
- GO: `corepack pnpm --filter @valida-ifc/web lint`
  - Result: passed.
- GO: `corepack pnpm --filter @valida-ifc/web typecheck`
  - Result: passed.
- GO: `corepack pnpm --filter @valida-ifc/web build`
  - Result: passed.
- GO: `corepack pnpm e2e`
  - Result: 4 passed.
  - Coverage: full flow on Chromium desktop/mobile plus visual regression on Chromium desktop/mobile.

## Evidence files

- E2E fixture pair:
  - `apps/web/e2e/fixtures/modelo-e2e.ifc`
  - `apps/web/e2e/fixtures/modelo-e2e-corrigido.ifc`
  - `apps/web/e2e/fixtures/criterios-e2e.csv`
- E2E tests:
  - `apps/web/e2e/full-flow.spec.ts`
  - `apps/web/e2e/visual-regression.spec.ts`
- Visual baselines:
  - `apps/web/e2e/visual-regression.spec.ts-snapshots/`
- Generated run artifacts:
  - `test-results/e2e`
  - `playwright-report`

## Open risks

- No Phase 7 blocker remains.
- Future sharing hardening can add revocation UI and audit ownership checks when multi-tenant authorization rules become explicit.
