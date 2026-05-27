# Project Control Checklist - Valida IFC

Last update: 2026-05-27
Reference timezone: America/Sao_Paulo
Owner: Product + Engineering
Last manual status refresh: 2026-05-24 (user requested in-app status review)
Last daily routine execution: 2026-05-27 (backend tests 29 passed; frontend lint/typecheck/build passed; end-to-end scenario and interface retest passed after next dev restart)
Current milestone: Versao Alfa / Phase 9 GO with conditions for pilot/Alfa; interface test link released for complete review.
Strategy update (IFC Tools vs Valida IFC): prioritize the audit evidence journey in Alfa; defer quantities, IA, natural-language audit requests, clash and sets until after Alfa validation.
Scope mapping update 2026-05-26: BIM criteria in CSV/XLS/IDS, severity scoring, delivery-ready report, 3D element nonconformity inspection and lightweight BIM auditor flow are Alfa scope; BCF, broader IDS, public API and self-host are Phase 10/Beta candidates after Alfa validation.

## How to use this artifact

1. This document is the official control checklist for project execution.
2. Each phase is a major gate. Do not mark a phase as complete without passing all validation points.
3. Every phase must end with:
   - Full system test (end-to-end flow).
   - Interface test (manual + visual evidence).
4. Attach evidence links (test logs, screenshots, report outputs, API captures) in the phase notes.

---

## Global Definition of Done (applies to all phases)

- [ ] Code merged and peer reviewed.
- [ ] Lint and type checks passing.
- [ ] Automated backend tests passing.
- [ ] Full system flow test executed and documented.
- [ ] Interface test executed and documented (desktop + mobile viewport).
- [ ] No blocker bug open for the phase scope.
- [ ] Release notes updated.

---

## Status snapshot (estimated from repository state on 2026-05-26)

- Phase 0: DONE
- Phase 1: DONE
- Phase 2: DONE
- Phase 3: DONE
- Phase 4: DONE
- Phase 5: DONE
- Phase 6: DONE
- Phase 7: DONE
- Phase 8: DONE
- Phase 9: GO WITH CONDITIONS
- Phase 10: NOT STARTED
- Product release: Alfa GO WITH CONDITIONS, Beta NOT STARTED

---

## Evidence - 2026-05-27 end-to-end review and test links

- Validation executed:
  - `corepack pnpm --filter @valida-ifc/web lint` (passed)
  - `corepack pnpm --filter @valida-ifc/web typecheck` (passed)
  - `corepack pnpm --filter @valida-ifc/web build` (passed)
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (29 passed)
  - API health check on `http://localhost:8000/health` (200)
- Complete scenario created:
  - Project: `Teste completo Codex 20260527194821`
  - Project ID: `f13c5c2f-04a9-44d3-9dd9-703c13d9e241`
  - IFC files: `fec4a7cb-5665-4d16-ab14-2805407dde34`, `0e4623d3-95bd-4701-894f-19062ff2c95d`
  - Criteria set: `ceca8a61-a39a-462e-8188-818b11729b12`
  - Audit: `e17ae0cd-586f-44d5-9934-269621c696af`, completed, score 50, 4 results
  - Snapshot: `http://localhost:8000/snapshots/8_z-sXYYtYya3yyZ6pljdzS2YoBn5ulvrFnm5Nreld8`
- Interface retest:
  - Desktop routes passed: `/demo`, `/dashboard`, `/projetos`, `/projetos/modelos`, `/criterios`, `/auditorias`, `/visualizador`, `/relatorios`.
  - Mobile routes passed: `/login`, `/projetos`, `/visualizador`.
  - No `Cannot find module`, `Model not found`, `Fragments:` or `Failed to fetch` markers found.
  - No horizontal overflow detected in tested desktop/mobile viewports.
  - Viewer canvas rendered on desktop and mobile.
- Evidence artifacts:
  - `docs/evidence/end-to-end-2026-05-27/scenario.json`
  - `docs/evidence/end-to-end-2026-05-27/ui-review-results-retest.json`
  - Screenshots in `docs/evidence/end-to-end-2026-05-27/*-retest.png`
- Operational note:
  - The first interface run hit stale Next dev chunks after `next build` (`Cannot find module './255.js'`).
  - Mitigation: restart the frontend dev server on port 3001 and rerun the browser review. Retest passed.

Decision: GO for complete local test link review on 2026-05-27. Expanded production use remains under Phase 9 conditions.

---

## Simplicity and efficiency guardrails

- [x] Keep `docs/PRODUCT_SCOPE_PHASE_MAPPING.md` as the product-scope map for current strategic items.
- [x] Treat CSV/XLS criteria import, IDS MVP, severity scoring, report, viewer and quick audit as Alfa audit-evidence scope.
- [x] Keep BCF, full IDS coverage, public API and self-host packaging out of Alfa production GO.
- [x] Keep the core journey obvious: Upload IFC -> Select rules -> Run audit -> See result -> Share evidence.
- [x] Prefer one clear path over many parallel options on first use.
- [x] Defer heavyweight platform features unless they directly reduce user effort now.
- [x] Keep default outputs actionable (what failed, where, how to fix).
- [x] Introduce compact "quick mode" on audits for first-time and repetitive use.
- [x] Add shareable read-only snapshots instead of full collaboration workflows in MVP.
- [x] Add IDS MVP support for common validation cases (entity + required property + allowed values).
- [x] Add Google login during Alfa construction to reduce onboarding friction.
- [ ] Keep quantities out of Alfa; schedule quantities only for Beta after Alfa usage validation.
- [ ] Keep IA and natural-language audit requests out of Alfa; schedule them only after Alfa validation.
- [ ] Keep clash detection and Sets/search sets/viewpoints out of Alfa; schedule them for Beta.

---

## Product release plan - Alfa and Beta

### Versao Alfa - planned scope

Purpose: validate the real user value of IFC audit evidence before adding productivity features.

- [x] BIM criteria import through CSV/TXT/XLS/XLSX for spreadsheet-based BIM requirements.
- [x] IDS MVP import for common entity/property/value validation cases.
- [x] Severity-based scoring with low, moderate and high weights.
- [x] Delivery-ready technical report with executive summary, details, fixes and affected elements.
- [x] 3D viewer inspection of nonconformities by element/GlobalId.
- [x] Lightweight browser flow for BIM auditors, independent of Solibri/Revit as runtime dependencies.
- [x] Core audit journey: upload IFC -> select/import criteria -> run audit -> inspect result -> share evidence.
- [x] Fast audit mode with clear defaults.
- [x] Real IFC viewer connected to audit results.
- [x] Executive report and read-only evidence snapshots.
- [x] IDS MVP for common validation cases.
- [x] Project timeline and run comparison.
- [x] Operational readiness artifacts: release checklist, monitoring plan, rollback dry-run and sign-off register.
- [x] Google login for Alfa onboarding.
- [ ] Public/security documentation covering LGPD, file retention, data handling and technical responsibility.
- [ ] Stakeholder UAT sign-off with real pilot evidence.
- [ ] Named support rotation and notification channel.

### Explicitly deferred from Alfa

- [ ] Quantities are deferred to Beta and must not block Alfa validation.
- [ ] IA assistant is deferred until after Alfa validation.
- [ ] Natural-language audit request flow is deferred until after Alfa validation and must require human confirmation before execution.
- [ ] Clash detection is deferred to Beta.
- [ ] Sets/search sets/viewpoints are deferred to Beta.
- [ ] Complex collaboration workflows are deferred until real pilot demand is proven.

### Alfa -> Beta gate

- [ ] At least one real project UAT accepted or rejected with clear notes.
- [x] Stakeholder sign-off recorded in `docs/SIGN_OFF_REGISTER.md`.
- [x] Support owner and backup named in `docs/POST_GO_LIVE_MONITORING.md`.
- [ ] Desktop and mobile interface evidence captured.
- [x] Product decision recorded: the audit journey is useful enough for pilot/Alfa, with interface adjustments required before expanded use.

### Versao Beta - planned scope

- [ ] BCF export for nonconformities if pilot/Beta confirms collaboration need.
- [ ] Broader IDS coverage and optional export of internal criteria as IDS where semantics match.
- [ ] Public API for external audit execution, with versioning, auth and rate/usage controls.
- [ ] Self-host packaging with deployment guide, backup/restore, monitoring and support matrix.
- [ ] Quantities by IFC type, level, discipline and audit status.
- [ ] CSV/XLSX export for quantities.
- [ ] IA assistant for explaining failures, summarizing reports and suggesting corrections.
- [ ] Natural-language audit request flow using IA, with review/confirmation before creating criteria or running audits.
- [ ] Clash detection with tolerance and issue list.
- [ ] Sets/search sets/viewpoints.
- [ ] BCF/export integrations if Beta pilot confirms need.

---

## Phase 0 - Governance and setup

### Scope checklist
- [x] Monorepo structure created (`apps`, `packages`, `docs`, `infra`, `samples`).
- [x] Workspace package manager configured (`pnpm-workspace.yaml`).
- [x] Root documentation created (`README.md`).
- [x] Environment defaults defined (`.env.example`).
- [x] Docker Compose baseline created.
- [x] Initial project roadmap and architecture docs created.

### Validation and tests (mandatory gate)
- [x] Repository structure validated with `rg --files`.
- [x] Local dependency bootstrap validated (`corepack` + `pnpm`).
- [x] Docs consistency spot-check completed.
- [x] Full system smoke test: services can boot together (frontend + api + db + redis).
- [x] Interface smoke test: login route opens and renders.

---

## Phase 1 - Core platform baseline

### Scope checklist
- [x] Frontend app shell and route map implemented.
- [x] Backend FastAPI modular routers implemented.
- [x] Shared contracts and types created.
- [x] Basic health endpoint created.
- [x] Worker scaffold created.
- [x] Initial testing structure created.

### Validation and tests (mandatory gate)
- [x] Frontend lint passes.
- [x] Frontend build passes.
- [x] Backend unit tests for baseline logic pass.
- [x] Full system test: frontend can call backend in local setup.
- [x] Interface test: core pages reachable (`/login`, `/dashboard`, `/projetos`, `/criterios`, `/auditorias`, `/visualizador`).

---

## Phase 2 - Persistence and auth

### Scope checklist
- [x] SQLAlchemy models for users, projects, files, criteria sets, criteria, audits and results.
- [x] Alembic configured.
- [x] Initial migrations created and versioned.
- [x] CRUD endpoints for users, projects, ifc files, criteria sets, criteria.
- [x] Auth flow with register/login implemented.
- [x] Password hashing enabled.
- [x] JWT issuance and validation enabled.
- [x] Protected routes enforced for internal APIs.

### Validation and tests (mandatory gate)
- [x] Migration upgrade path tested in containerized environment.
- [x] API persistence tests pass (`apps/api/tests/test_api_persistence.py`).
- [x] Auth tests included in persistence flow (register/login/token-protected endpoints).
- [x] Full system test: register -> login -> create project -> list project.
- [x] Interface test: login UX + protected pages redirect behavior.

---

## Phase 3 - IFC ingestion and criteria import

### Scope checklist
- [x] IFC upload endpoint saves file to `infra/storage`.
- [x] IFC metadata persisted (filename, size, schema, project relation).
- [x] Basic malformed IFC protection implemented.
- [x] `FILE_SCHEMA` extraction implemented.
- [x] Criteria import endpoint implemented (CSV/TXT/XLS/XLSX pipeline baseline).
- [x] Criteria validation schema implemented.
- [x] Severity normalization and score base logic implemented.
- [x] Upload and storage constraints introduced (limits + retention policy baseline).

### Validation and tests (mandatory gate)
- [x] Unit tests for schema extraction pass.
- [x] Unit tests for severity normalization and scoring pass.
- [x] Import validation tests pass.
- [x] Full system test: create project -> upload IFC -> import criteria -> list persisted records.
- [x] Interface test: upload and criteria pages with real API flow.

### Evidence - 2026-05-23 Phase 3 GO

Phase: Phase 3 - IFC ingestion and criteria import
Date: 2026-05-23
Commit: df2cd77 (HEAD atual; evidencia gerada no working tree antes do commit de fechamento)
Owner: Codex + Engineering

Backend tests:
- GO: `docker compose run --rm --no-deps api pytest apps/api/tests -q`
- Result: 15 passed, 181 warnings.
- Log: `docs/evidence/phase3-2026-05-23/backend-tests.log`

Frontend lint/typecheck/build:
- GO: `corepack pnpm --filter @valida-ifc/web lint`
- GO: `corepack pnpm --filter @valida-ifc/web typecheck`
- GO: `corepack pnpm --filter @valida-ifc/web build`
- Logs:
  - `docs/evidence/phase3-2026-05-23/frontend-lint.log`
  - `docs/evidence/phase3-2026-05-23/frontend-typecheck.log`
  - `docs/evidence/phase3-2026-05-23/frontend-build.log`

Full system flow evidence:
- GO: `corepack pnpm e2e`
- Result: 2 passed (Chromium desktop + Chromium mobile).
- Covered path: register/login -> project -> IFC upload -> criteria import -> persisted lists -> audit -> viewer -> HTML report.
- Log: `docs/evidence/phase3-2026-05-23/e2e-full-flow.log`

Interface evidence:
- Upload desktop: `docs/evidence/phase3-2026-05-23/upload-ifc-desktop.png`
- Upload mobile: `docs/evidence/phase3-2026-05-23/upload-ifc-mobile.png`
- Criteria desktop: `docs/evidence/phase3-2026-05-23/criterios-desktop.png`
- Criteria mobile: `docs/evidence/phase3-2026-05-23/criterios-mobile.png`

Open risks:
- Nenhum bloqueador de Phase 3 encontrado apos o gate completo.
- Validacao de desempenho com IFC medio/grande permanece como escopo de Phase 5/Phase 9, nao como pendencia de ingestao/importacao da Phase 3.

Decision: GO

---

## Phase 4 - Audit engine and asynchronous processing

### Scope checklist
- [x] Audit run orchestration service layer implemented.
- [x] Async mode for audits (`/audits?mode=async`) implemented.
- [x] Queue integration with Redis + worker implemented.
- [x] Audit status lifecycle supported (`pending/running/completed/failed`).
- [x] Polling endpoint for audit status implemented.
- [x] WebSocket status endpoint implemented for realtime updates.
- [x] Detailed result persistence by criterion and element implemented.
- [x] Error capture and persistence (`error_message`) implemented.
- [x] Automated coverage for enqueue, worker execution, completed status, failed status and `error_message` persistence added.
- [x] Operational worker startup evidence with API + Postgres + Redis + worker compose stack attached.
- [x] Queue failure behavior specified and tested: async mode now fails explicitly with HTTP 503 and persisted audit `failed`; no hidden synchronous fallback.
- [x] Worker service dependency/readiness hardened for Postgres and Redis.
- [x] Timeout/retry/dead-letter policy configured and tested through RQ retry + failed job registry.

### Validation and tests (mandatory gate)
- [x] Worker startup validated with compose stack.
- [x] Backend tests pass with sync and async coverage.
- [x] Backend tests cover async queue enqueue, Redis unavailable, worker completed and worker failed execution.
- [x] Async API/UI request path validated through `/audits?mode=async` against real Compose Redis/RQ worker.
- [x] Full system test: login -> create project -> upload IFC -> import criteria -> run audit async request -> fetch results.
- [x] Interface test: audit page status updates + final result rendering in desktop and mobile E2E.

### Evidence - 2026-05-23 Phase 4 GO

Phase: Phase 4 - Audit engine and asynchronous processing
Date: 2026-05-23
Commit: df2cd77 (working tree contains uncommitted Phase 4 closure changes)
Owner: Codex + Engineering

Verified implementation:
- API creates `pending` audit runs and supports `mode=async` / `mode=sync`.
- Redis/RQ enqueue is wired through `get_audit_queue()` and `process_audit_run`.
- Worker process starts from `apps.worker.tasks.worker`, waits for Redis and database readiness, enables RQ scheduler, and consumes the configured audit queue.
- Audit service transitions to `running`, then `completed` or `failed`, and persists `error_message` on failure.
- Result persistence stores summary rows and element-level rows with `element_guid`, type/name, severity, score, actual/expected values and fix suggestion.
- Frontend auditorias page starts `/audits?mode=async`, opens WebSocket, polls `/audits/{id}/status`, fetches final audit and result rows.
- RQ policy is configured with timeout, result TTL, failure TTL, retry count and retry intervals.
- Failed jobs are visible through `valida_ifc_queue_failed_jobs`.

Validation executed:
- GO: `docker compose run --rm --no-deps api pytest apps/api/tests -q`
- Result: 19 passed, 279 warnings.
- GO: `corepack pnpm --filter @valida-ifc/web lint`
- Result: passed.
- GO: `corepack pnpm --filter @valida-ifc/web typecheck`
- Result: passed.
- GO: `corepack pnpm --filter @valida-ifc/web build`
- Result: passed.
- GO: `corepack pnpm e2e`
- Result: 2 passed (Chromium desktop + Chromium mobile) using `docker-compose.e2e.yml` with Postgres + Redis + API + worker.
- GO: `py apps\api\scripts\verify_async_worker_flow.py`
- Result: passed; verified one completed async audit and one failed async audit through the real worker with non-empty `queue_job_id`.
- GO: `docker compose -f docker-compose.e2e.yml --project-name valida-ifc-e2e ps`
- Result: API healthy, Postgres healthy, Redis healthy and worker running.

Open risks:
- No Phase 4 blocker remains.
- Future hardening belongs to Phase 8/9: production queue dashboard, alert routing, load profile and operational runbook.

Evidence artifact:
- `docs/evidence/phase4-closure-2026-05-23/RESULTS.md`

Decision: GO

---

## Phase 5 - IFC viewer (real geometry + inspection)

### Scope checklist
- [x] Viewer data endpoint implemented (`/ifc-files/{id}/viewer-data`).
- [x] Viewer geometry endpoint implemented (`/ifc-files/{id}/viewer-geometry`).
- [x] Geometry extraction pipeline integrated in backend adapter.
- [x] Frontend three.js canvas wired to backend payloads.
- [x] GlobalId mapping maintained from audit results to rendered elements.
- [x] Element selection and focus behavior implemented.
- [x] Filters by status, severity, criteria code and GlobalId implemented.
- [x] Failed elements list with click-to-focus implemented.
- [x] Real IFC loader in browser (`web-ifc`) integrated with authenticated IFC download and backend fallback.
- [x] Progressive canvas mesh mounting added to avoid blocking the UI during large filter/model updates.
- [x] Stale canvas render cancellation added when filters/model change.
- [x] Viewer performance telemetry shown in UI (loader origin, load time, triangles, heap when available, canvas mounted elements and render duration).
- [x] GPU cost reduced with high-performance WebGL preference and capped pixel ratio.
- [x] Browser loader cleanup hardened for real `web-ifc` runtime variants.
- [x] Canvas initialization hardened after authenticated app-shell readiness.
- [x] Render-on-demand and lightweight technical materials applied for large model interaction.
- [x] Large-model canvas budget applied for browser-grade orbit/filter stability.
- [x] Full performance pass for medium/large IFC files (memory/frame stability).

### Validation and tests (mandatory gate)
- [x] Backend payload contracts verified with tests and manual calls.
- [x] Full system test: audit completed -> open viewer -> inspect failed elements by GlobalId.
- [x] Interface test: filters, selection, highlight, navigation to viewer.
- [x] Static validation after browser loader integration: frontend lint/typecheck/build and backend tests passed on 2026-05-23.
- [x] Full E2E flow passed after progressive canvas rendering update on 2026-05-23 (desktop + mobile Chromium).
- [x] Interface performance test: frame-rate and interaction stability on representative dataset pack.

### Evidence - 2026-05-23 browser loader pass

- Added `web-ifc` dependency and served `web-ifc.wasm` from the frontend public assets.
- Viewer now loads IFC bytes in-browser via `/ifc-files/{id}/download`, maps geometry by `GlobalId`, and falls back to backend geometry when needed.
- Validation passed:
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q`
- Local route check: `/visualizador` returned HTTP 200 on dev server port 3001; `/web-ifc/web-ifc.wasm` returned HTTP 200 with `application/wasm`.
- Historical blocker resolved on 2026-05-23 with external real IFC dataset evidence.

### Evidence - 2026-05-23 partial hardening pass

- Applied progressive mesh mounting in the viewer canvas with batched frame yielding.
- Added render cancellation when filters, GlobalId search, criteria-code search or selected IFC model change.
- Added canvas telemetry for mounted elements and render duration.
- Added warning path for high-triangle models.
- Validation passed:
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (19 passed)
  - `corepack pnpm e2e` (2 passed: Chromium desktop + Chromium mobile)
- Previous blocker resolved by the real IFC performance gate below.

### Evidence - 2026-05-23 real IFC performance gate

- Dataset source: `G:\Drives compartilhados\MaxiCAD Projetos\IFCMaxi\00 - Modelos BIM`.
- Tested model: `SALE-ELE-PB-0000-EMBA-MODE-R02.ifc` (85.08 MB).
- Browser loader: `web-ifc`.
- Browser-extracted triangles: 2,072,009.
- Canvas rendered real geometry with large-model budget; screenshot shows `Canvas 359/2970 em 282 ms`.
- Used JS heap after load/orbit/filter: about 289.9 MB.
- Measured frame stability after load:
  - idle: 60 FPS average, p95 16.7 ms, 0 long frames >50 ms.
  - orbit: 60 FPS average, p95 16.7 ms, 0 long frames >50 ms.
  - filters: 60 FPS average, p95 16.8 ms, 0 long frames >50 ms.
- GlobalId, criteria-code filter and clickable failed-elements list validated using `PERF-GID-001`.
- Evidence artifact: `docs/evidence/phase5-real-ifc-2026-05-23/RESULTS.md`.
- Validation passed after implementation:
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (19 passed)
  - `corepack pnpm e2e` (2 passed: Chromium desktop + Chromium mobile)

Decision: GO

---

## Phase 6 - Simple UX and reporting polish

### Scope checklist
- [x] HTML report endpoint implemented.
- [x] PDF report endpoint implemented.
- [x] Executive summary fields included (score, approved, failed).
- [x] Detailed rows by criterion and element included.
- [x] Viewer navigation references included in report context.
- [x] Audit quick mode implemented (compact form + sane defaults + one primary action).
- [x] Simplified UI copy and labels for non-technical users on key screens.
- [x] Report polished to one-page executive summary first, details second.
- [x] Report print preview approved for Chrome/Edge.

### Validation and tests (mandatory gate)
- [x] API tests include report endpoint assertions.
- [x] Full system test: run audit -> generate HTML/PDF -> verify content presence.
- [x] Interface test: report links from audit page open correctly.
- [x] Interface timing test: first successful audit from login in <= 3 minutes on default flow.
- [x] Cross-browser print preview validation (Chrome/Edge).

### Evidence - 2026-05-24 Audit Quick Mode

- Implemented compact audit quick mode in `apps/web/src/app/auditorias/page.tsx`.
- Sane defaults now select the most recently updated project, most recently uploaded IFC, and most recently updated criteria set when the current selection is missing.
- The audit card now shows a compact selected-scope summary and keeps optional manual selectors under one primary action.
- Validation passed:
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (19 passed)
  - `corepack pnpm e2e` (2 passed on rerun: Chromium desktop + Chromium mobile)
- Note: first E2E attempt had a desktop-only navigation timing failure after the audit step; the same mobile run passed and the immediate rerun passed on both viewports.

### Evidence - 2026-05-24 UX copy, executive report, and timing

- Simplified copy on key flow screens:
  - `apps/web/src/app/projetos/page.tsx`
  - `apps/web/src/app/projetos/upload/page.tsx`
  - `apps/web/src/app/criterios/page.tsx`
  - `apps/web/src/app/relatorios/page.tsx`
- Polished real report endpoints in `apps/api/app/reports/router.py`:
  - HTML report now opens with decision, executive summary, metrics, and top correction actions.
  - Detailed element failures move to the details section with print CSS.
  - PDF report now starts with executive summary and first correction actions.
- Added backend assertions for the new report structure in `apps/api/tests/test_api_persistence.py`.
- Updated E2E flow to use audit quick mode defaults and assert first successful audit from login is <= 3 minutes.
- Validation passed:
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (19 passed)
  - `corepack pnpm e2e` (2 passed: Chromium desktop + Chromium mobile)

### Evidence - 2026-05-24 Chrome/Edge print preview

- Generated real audit report from E2E fixture data and validated print media in:
  - Chrome (`channel: chrome`)
  - Microsoft Edge (`channel: msedge`)
- Evidence files:
  - `docs/evidence/phase6-print-preview-2026-05-24/RESULTS.md`
  - `docs/evidence/phase6-print-preview-2026-05-24/results.json`
  - `docs/evidence/phase6-print-preview-2026-05-24/chrome-print-media.png`
  - `docs/evidence/phase6-print-preview-2026-05-24/chrome-print-preview.pdf`
  - `docs/evidence/phase6-print-preview-2026-05-24/edge-print-media.png`
  - `docs/evidence/phase6-print-preview-2026-05-24/edge-print-preview.pdf`
- Automated print checks passed in both browsers:
  - screen-only actions hidden in print media;
  - details section receives page break styling;
  - no horizontal overflow;
  - executive summary, correction actions and detail table visible.

Decision: GO

---

## Phase 7 - Lightweight collaboration and project history

### Scope checklist
- [x] Browser E2E suite for full user journey.
- [x] CI pipeline for lint/typecheck/test/build + artifact upload.
- [x] Deterministic fixture pack for IFC and criteria import.
- [x] Read-only snapshot link per audit/report (tokenized, no login required for view-only).
- [x] Project timeline view with run history (date, score, passed/failed criteria).
- [x] Comparison between two runs (new failures, resolved failures, persistent failures).
- [x] Keep collaboration minimal: no complex approval workflow in MVP.

### Validation and tests (mandatory gate)
- [x] Full system test automated in CI (not only local manual).
- [x] Interface test automated with screenshots on desktop and mobile viewport.
- [x] Snapshot link security test (token scope + expiration).
- [x] Timeline and comparison E2E test with deterministic fixture pair.
- [x] Pixel-baseline visual regression comparison for core screens.

### Evidence - 2026-05-23 baseline automation pass

- Added Playwright suite covering: register/login -> project -> IFC upload -> criteria import -> audit -> viewer -> HTML report.
- Added deterministic fixtures:
  - `apps/web/e2e/fixtures/modelo-e2e.ifc`
  - `apps/web/e2e/fixtures/criterios-e2e.csv`
- CI now runs frontend lint/typecheck/build, backend tests, and E2E with artifact upload (`e2e-evidence`) for logs, traces and screenshots.
- Validation passed:
  - `corepack pnpm e2e` (2 passed: desktop Chromium + mobile Chromium)
  - screenshots and traces generated under `test-results/e2e`
- Phase 7 scope is closed; sharing remains intentionally limited to read-only evidence links for MVP simplicity.

### Evidence - 2026-05-24 Phase 7 GO

- Added tokenized read-only snapshots:
  - `audit_snapshots` persistence and Alembic migration.
  - authenticated creation endpoint per completed audit.
  - public read-only snapshot and report HTML endpoints by token.
  - token hash storage, audit scope validation, invalid-token handling and expiration handling.
- Added project history and comparison:
  - project audit timeline endpoint with date, score, approved/failed counts, IFC and criteria names.
  - comparison endpoint for two runs on the same project, returning new, resolved and persistent failures.
  - `Relatorios e snapshots` UI with project timeline, snapshot generation and run comparison.
- Kept collaboration lightweight:
  - no approval workflow, comments, assignment queues or role-heavy collaboration introduced.
  - sharing is limited to read-only evidence links.
- Added deterministic comparison fixture:
  - `apps/web/e2e/fixtures/modelo-e2e-corrigido.ifc`.
- Added visual regression:
  - `apps/web/e2e/visual-regression.spec.ts`.
  - desktop/mobile baselines under `apps/web/e2e/visual-regression.spec.ts-snapshots`.
- Validation passed:
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (19 passed)
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - `corepack pnpm e2e` (4 passed: full flow + visual regression on desktop/mobile)

Decision: GO

---

## Phase 8 - Pragmatic openBIM and essential hardening

### Scope checklist
- [x] Upload limits and retention controls introduced.
- [x] Malformed IFC defensive checks introduced.
- [x] Structured logging schema (request_id, user_id, audit_id correlation).
- [x] Metrics and alert endpoints available for operational checks.
- [x] IDS MVP ingestion (entity, property, expected/allowed value, required flag).
- [x] IDS-to-internal-rule mapping with clear validation errors.
- [x] Fix Guide templates for top 5 recurring failures (Revit/Archicad oriented instructions).
- [x] Essential security review (token, route exposure, CORS, file access).
- [x] Storage lifecycle cleanup verification.

### Validation and tests (mandatory gate)
- [x] IDS MVP import -> audit execution -> report visibility tested end-to-end.
- [x] Interface test: user can understand and fix at least one IDS-derived failure from UI guidance.
- [x] Essential load test for concurrent uploads and async audits.
- [x] Observability drill: trace one injected worker/API failure from alert to correlated logs.

### Evidence - 2026-05-24 Phase 8 GO

- Implemented IDS MVP import for `.ids`/`.xml` through the existing criteria import flow.
- IDS mapping covers entity applicability, required property, and allowed/simple property values.
- Clear import errors are returned for unsupported/missing IDS MVP fields such as absent entity or property name.
- Added Revit/Archicad-oriented fix guide templates for recurring failures and surfaced them in audit results/reports.
- Criteria UI accepts IDS/XML files.
- Security/lifecycle checks added for protected criteria/download routes and expired IFC cleanup.
- Alerts now expose failed RQ jobs as `audit_queue_failed_jobs`.
- Added load smoke script: `apps/api/scripts/phase8_load_smoke.py`.
- Validation passed:
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (25 passed)
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - `corepack pnpm e2e` (6 passed: full flow, visual regression, IDS MVP interface guidance on desktop/mobile)
  - `py apps\api\scripts\phase8_load_smoke.py` (4 concurrent uploads + 4 async audits completed; alerts OK before injected failure)
  - `py apps\api\scripts\verify_async_worker_flow.py` (completed audit + injected failed audit)
- Observability drill evidence:
  - failed audit `441bcab2-f115-4c9f-a140-fc6caf1b0f45`;
  - failed queue job `6652d417-3e67-4b35-9150-138afb45a667`;
  - `/alerts` returned `audit_queue_failed_jobs` with severity `critical`;
  - worker logs contained the failed audit id, job id and `audit_failed`.
- Evidence artifact: `docs/evidence/phase8-2026-05-24/RESULTS.md`.

Decision: GO

---

## Phase 9 - Lean release readiness and go-live

### Scope checklist
- [x] Release checklist finalized (infra, data, backup, rollback): `docs/RELEASE_READINESS_CHECKLIST.md`.
- [x] User guide with "auditoria rapida" path finalized: `docs/USER_GUIDE_QUICK_AUDIT.md`.
- [x] Google login implemented and validated for Alfa onboarding.
  - Required in Alfa because the competitor test showed Google OAuth materially reduces first-use friction.
  - Must preserve existing JWT-protected API behavior and e-mail/password login unless a later product decision removes it.
  - Evidence: `docs/evidence/phase9-2026-05-24/google-login/RESULTS.md`.
- [x] Acceptance test with one real project pilot executed.
  - IFC source: `H:\Drives compartilhados\MaxiCAD Projetos\IFCMaxi\00 - Modelos BIM\SALE-MET-EX-9001-TOR1-GERL-R01.ifc`.
  - Local evidence copy: `samples/ifc/SALE-MET-EX-9001-TOR1-GERL-R01.ifc`.
  - Automated acceptance: `PILOT_IFC_PATH=samples/ifc/SALE-MET-EX-9001-TOR1-GERL-R01.ifc corepack pnpm --filter @valida-ifc/web e2e e2e/pilot-acceptance.spec.ts` (2 passed: desktop + mobile).
- [x] Stakeholder sign-off recorded.
  - Register prepared: `docs/SIGN_OFF_REGISTER.md`.
  - Formal request prepared: `docs/STAKEHOLDER_GO_SIGNOFF_REQUEST.md`.
  - Closure packet prepared: `docs/PRODUCTION_GO_BLOCKER_RESOLUTION.md`.
  - Decision recorded on 2026-05-26: GO for pilot/Alfa with interface adjustments pending before expanded use.
- [x] Post-go-live monitoring plan and support rotation active for pilot/Alfa.
  - Plan prepared: `docs/POST_GO_LIVE_MONITORING.md`.
  - Closure packet prepared: `docs/PRODUCTION_GO_BLOCKER_RESOLUTION.md`.
  - Named owner/channel recorded: Equipe MaxiCAD and `suporte@maxicad.com.br`.

### Validation and tests (mandatory gate)
- [x] Automated full system flow passed on desktop and mobile (`corepack pnpm e2e`, 6 passed).
- [x] Automated real pilot acceptance passed on desktop and mobile (`e2e/pilot-acceptance.spec.ts`, 2 passed).
- [x] Backend tests passed (`docker compose run --rm --no-deps api pytest apps/api/tests -q`, 27 passed).
- [x] Frontend lint/typecheck/build passed.
- [x] Google login E2E passed on desktop and mobile.
- [x] Full system UAT signed off with real pilot project for pilot/Alfa.
- [ ] Interface UAT signed off without conditions by stakeholder.
  - Current acceptance is GO with interface adjustments pending before expanded use.
- [x] Dry-run release and rollback executed in staging-equivalent environment.
  - Evidence: `docs/evidence/phase9-2026-05-24/rollback-dry-run/RESULTS.md`.

### Evidence - 2026-05-24 Phase 9 partial

- Release readiness checklist finalized for infra, data, backup and rollback.
- User guide closed with the "auditoria rapida" path.
- Monitoring and support rotation plan prepared for go-live activation.
- Sign-off register prepared, but signatures remain pending.
- Real pilot IFC copied from shared drive and stored locally at `samples/ifc/SALE-MET-EX-9001-TOR1-GERL-R01.ifc` (1,888,076 bytes; IFC2X3).
- Added reusable pilot acceptance spec: `apps/web/e2e/pilot-acceptance.spec.ts`.
- Automated validation passed:
  - `docker compose build api`
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (27 passed)
  - `corepack pnpm --filter @valida-ifc/web lint`
  - `corepack pnpm --filter @valida-ifc/web typecheck`
  - `corepack pnpm --filter @valida-ifc/web build`
  - `corepack pnpm e2e` (6 passed: full flow, IDS MVP guidance and visual regression on desktop/mobile)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-alpha-client corepack pnpm --filter @valida-ifc/web e2e e2e/google-login.spec.ts --project chromium-desktop` (1 passed)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-alpha-client corepack pnpm --filter @valida-ifc/web e2e e2e/google-login.spec.ts --project chromium-mobile` (1 passed)
  - `PILOT_IFC_PATH=C:\MaxiCAD_Projetos_IA\Valida-IFC\samples\ifc\SALE-MET-EX-9001-TOR1-GERL-R01.ifc corepack pnpm --filter @valida-ifc/web e2e e2e/pilot-acceptance.spec.ts` (2 passed: real IFC upload, criterios, auditoria rapida, viewer and report on desktop/mobile)
- Pilot interface evidence stored under `docs/evidence/phase9-2026-05-24/pilot-acceptance/`.
- Google login evidence stored under `docs/evidence/phase9-2026-05-24/google-login/`.
- Google login gate revalidated on 2026-05-24:
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-alpha-client corepack pnpm --filter @valida-ifc/web e2e e2e/google-login.spec.ts --project chromium-desktop` (1 passed)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-alpha-client corepack pnpm --filter @valida-ifc/web e2e e2e/google-login.spec.ts --project chromium-mobile` (1 passed)
- Rollback dry-run evidence stored under `docs/evidence/phase9-2026-05-24/rollback-dry-run/`.
- Production GO blocker resolution packet stored at `docs/PRODUCTION_GO_BLOCKER_RESOLUTION.md`.
- Open production GO blockers at that time:
  - stakeholder sign-off;
  - named support rotation and notification channel.
- Evidence artifact: `docs/evidence/phase9-2026-05-24/RESULTS.md`.

Decision: GO WITH CONDITIONS for pilot/Alfa; expanded production use pending interface adjustments and production dashboard/alert wiring.

### Evidence - 2026-05-26 Phase 9 sign-off update

- Product owner: Adriano - MaxiCAD.
- Product decision: GO, with many interface adjustments still expected.
- BIM/domain stakeholder: Adriano - MaxiCAD.
- BIM/domain decision: GO with interface adjustments.
- Engineering release owner: MaxiCAD.
- Engineering decision: GO.
- Operations/support owner: Equipe MaxiCAD.
- Engineering on-call: Equipe MaxiCAD / Equipe MaxiCAD.
- Product/BIM support: Equipe MaxiCAD / Equipe MaxiCAD.
- Stakeholder contact: Adriano - MaxiCAD / Equipe MaxiCAD.
- Incident notification channel: `suporte@maxicad.com.br`.
- 72-hour monitoring owner: Equipe MaxiCAD.
- Acceptance note: GO aprovado para piloto/Alfa, com ajustes de interface pendentes antes de ampliar uso.
- Updated artifacts:
  - `docs/SIGN_OFF_REGISTER.md`
  - `docs/POST_GO_LIVE_MONITORING.md`
  - `docs/PRODUCTION_GO_BLOCKER_RESOLUTION.md`

Open conditions:
- Triage, prioritize and validate the pending interface adjustments before expanded use.
- Connect production dashboards/alerts in the target deployment environment.

### Evidence - 2026-05-25 daily control routine

- Validation executed:
  - `corepack pnpm --filter @valida-ifc/web lint` (passed)
  - `corepack pnpm --filter @valida-ifc/web typecheck` (passed; first run failed before `.next` types existed, rerun passed after build)
  - `corepack pnpm --filter @valida-ifc/web build` (passed)
  - `docker compose run --rm --no-deps api pytest apps/api/tests -q` (28 passed)
- Interface smoke (desktop routes) executed with HTTP 200:
  - `/login`, `/dashboard`, `/projetos`, `/projetos/upload`, `/criterios`, `/auditorias`, `/visualizador`, `/relatorios`
- Operational note:
  - `next dev` cache/chunk instability reappeared (`Cannot find module './443.js'`) during smoke checks.
  - Mitigation used in routine: stop dev server, remove `apps/web/.next`, restart dev server.
  - Status after mitigation: interface smoke returned to 200 on all core routes.
- Phase status impact:
  - No phase moved during the 2026-05-25 routine. Phase 9 still required sign-off and named support at that point.

### Phase status impact after 2026-05-26 sign-off

- Phase 9 moved from PARTIAL to GO WITH CONDITIONS for pilot/Alfa after sign-off and support ownership were provided on 2026-05-26.
- Expanded use remains conditional because interface adjustments and target production dashboard/alert wiring are still open.

---

## Phase 10 - Beta openBIM extensions and deployment model

### Scope checklist
- [ ] Start only after Phase 9 closes without open interface conditions and support rotation/channel remains active.
- [ ] Export nonconformities as BCF with GlobalId, title, description, severity, rule code and evidence reference.
- [ ] Expand IDS support beyond the MVP subset based on pilot files and user demand.
- [ ] Export applicable internal criteria as IDS while preserving unsupported-rule warnings.
- [ ] Create a public API contract for external audit execution.
- [ ] Add API auth, versioning, usage limits and operational observability for public/API-driven use.
- [ ] Package self-host deployment with Docker/Compose or equivalent production profile.
- [ ] Document self-host backup, restore, update, rollback, monitoring and support responsibility.
- [ ] Evaluate bSDD, CDE integrations, clash, search sets, quantities and IA only when Beta evidence shows demand.

### Validation and tests (mandatory gate)
- [ ] Backend tests cover BCF/IDS/API/self-host configuration paths introduced in the phase.
- [ ] Frontend lint/typecheck/build pass.
- [ ] Full system test: API-driven or self-hosted audit flow runs from upload/criteria to viewer/report.
- [ ] Interface test: Beta additions do not add friction to the Alfa quick audit journey.
- [ ] Deployment test: self-host package can be installed, backed up, restored and rolled back from documented steps.
- [ ] Interoperability test: BCF/IDS artifacts open or validate in at least one independent compatible tool when applicable.

### Open risks
- BCF and full IDS semantics can expand scope quickly; keep the first Beta slice export-focused and evidence-driven.
- Self-host creates support obligations; do not ship it without named owner, update path and rollback path.
- Public API changes operational risk; require observability, auth and rate/usage controls before pilot exposure.

Decision: NOT STARTED / WAITING FOR ALFA VALIDATION

---

## Mandatory test protocol at the end of each phase

Run all blocks and store evidence:

1. Backend tests
   - `docker compose run --rm --no-deps api pytest apps/api/tests -q`
2. Frontend static quality
   - `corepack pnpm --filter @valida-ifc/web lint`
   - `corepack pnpm --filter @valida-ifc/web typecheck`
   - `corepack pnpm --filter @valida-ifc/web build`
3. Full system flow (manual or automated)
   - Register/login
   - Create project
   - Upload IFC
   - Import criteria
   - Run audit async
   - Open viewer
   - Open HTML/PDF report
   - Current automated command: `corepack pnpm e2e`
4. Interface validation
   - Login, Dashboard, Projetos, Criterios, Auditorias, Visualizador, Relatorios
   - Desktop viewport + one mobile viewport
   - Error states visible and actionable

---

## Evidence log template (copy per phase)

Phase:
Date:
Commit:
Owner:

Backend tests:
Frontend lint/typecheck/build:
Full system flow evidence:
Interface evidence:
Open risks:
Decision: GO / NO-GO
