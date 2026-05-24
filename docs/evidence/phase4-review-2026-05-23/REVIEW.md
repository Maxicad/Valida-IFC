# Phase 4 Review Evidence - 2026-05-23

Scope: audit engine and asynchronous processing.

Superseded by: `docs/evidence/phase4-closure-2026-05-23/RESULTS.md`.

## Commands Executed

- `docker compose run --rm --no-deps api pytest apps/api/tests -q`
  - Result: 15 passed, 181 warnings.
- `corepack pnpm --filter @valida-ifc/web lint`
  - Result: passed.
- `corepack pnpm --filter @valida-ifc/web typecheck`
  - Result: passed.
- `corepack pnpm --filter @valida-ifc/web build`
  - Result: passed.
- `corepack pnpm e2e`
  - Result: failed before app validation because Windows `python` alias points to Microsoft Store.
- `E2E_PYTHON=py corepack pnpm e2e`
  - Result: failed before app validation because that Python environment lacks API dependencies such as `pydantic`.
- `E2E_PYTHON=C:\Users\adria\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe corepack pnpm e2e`
  - Result: 2 passed (Chromium desktop + Chromium mobile).

## Evidence Summary

- The application-level flow works through the browser journey:
  register/login -> project -> upload IFC -> criteria import -> audit request -> status polling/WebSocket -> results -> viewer -> HTML report.
- The backend unit/integration suite passes.
- The frontend lint, typecheck and production build pass.

## Phase 4 Remaining Gap

The current E2E suite validates the async-facing UI and API contract, but does not prove a real Redis/RQ worker execution. The E2E environment sets `REDIS_URL=redis://127.0.0.1:6399/0`; when enqueue fails, the API falls back to synchronous execution and still completes the audit. A final Phase 4 GO needs evidence with Redis and worker running, plus assertions that `queue_job_id` is set and the worker performs the state transition to `completed` or `failed`.
