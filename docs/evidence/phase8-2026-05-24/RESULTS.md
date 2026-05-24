# Phase 8 Evidence - Pragmatic openBIM and Essential Hardening

Date: 2026-05-24
Owner: Codex + Engineering
Decision: GO

## Implemented scope

- IDS MVP import for `.ids` and `.xml` files through `POST /criteria-sets/import`.
- IDS-to-internal-rule mapping for common MVP cases:
  - applicability entity -> `entity_ifc`;
  - required property without value -> `property_not_empty`;
  - property with allowed/simple values -> `property_value_in_list`;
  - clear row-level import errors when entity or property name is missing.
- Practical fix guide templates for recurring failures:
  - IFC schema;
  - entity exists;
  - property exists;
  - property not empty;
  - property value equals/in-list;
  - classification exists;
  - geometry exists.
- Criteria UI accepts `.ids` and `.xml`.
- Alerts now expose failed RQ jobs as `audit_queue_failed_jobs`.
- Added repeatable load smoke script: `apps/api/scripts/phase8_load_smoke.py`.

## Validation executed

- Backend tests:
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q`
  - Result: 25 passed.
- Frontend static checks:
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - Result: passed.
- Full system and interface E2E:
  - `corepack pnpm e2e`
  - Result: 6 passed.
  - Covered desktop and mobile:
    - register/login -> project -> upload IFC -> criteria import -> async audit -> viewer -> report -> timeline/comparison/snapshot;
    - IDS MVP import -> async audit -> visible fix guide.
- Essential load smoke:
  - `py apps\api\scripts\phase8_load_smoke.py`
  - Result:
    - concurrency: 4;
    - uploads: 4;
    - async audits: 4;
    - completed audits: 4;
    - elapsed: 3781.24 ms;
    - metrics include audit counters: true;
    - alerts status before injected failure: ok.
- Observability drill:
  - `py apps\api\scripts\verify_async_worker_flow.py`
  - Completed audit: `6a2d8c46-803b-4c69-9e49-6f6aa5ed4d6a`.
  - Failed audit: `441bcab2-f115-4c9f-a140-fc6caf1b0f45`.
  - Failed queue job: `6652d417-3e67-4b35-9150-138afb45a667`.
  - Failure message: `invalid literal for int() with base 10: 'not-a-number'`.
  - `/alerts` response after drill: `audit_queue_failed_jobs`, severity `critical`, count `1`.
  - Worker logs include the failed audit id, queue job id and `audit_failed`.

## Security and lifecycle evidence

- Protected criteria and IFC download routes require authentication.
- Snapshot token scope/expiration tests remain passing.
- Storage lifecycle cleanup removes expired project IFC files before accepting a new upload.
- CORS remains constrained by configured origins.

## Open risks

- IDS MVP intentionally does not cover full IDS/bSDD semantics.
- Production alert routing and external dashboards remain release-readiness work for Phase 9.
