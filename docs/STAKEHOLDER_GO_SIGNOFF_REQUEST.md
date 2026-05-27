# Stakeholder GO Sign-Off Request - Valida IFC

Date: 2026-05-26
Status: Formal approval recorded as GO with conditions for pilot/Alfa; interface adjustments remain pending before expanded use.

## Requested Decision

Please review the Phase 9 release evidence and record one of the following decisions:

- GO for production
- GO with conditions
- NO-GO

## Evidence Package

- Project control checklist: `docs/PROJECT_CONTROL_CHECKLIST.md`
- Project status dashboard: `docs/PROJECT_CONTROL_STATUS.html`
- Release readiness checklist: `docs/RELEASE_READINESS_CHECKLIST.md`
- Real pilot acceptance evidence: `docs/evidence/phase9-2026-05-24/pilot-acceptance/`
- Google login evidence: `docs/evidence/phase9-2026-05-24/google-login/RESULTS.md`
- Rollback dry-run evidence: `docs/evidence/phase9-2026-05-24/rollback-dry-run/RESULTS.md`
- Monitoring plan: `docs/POST_GO_LIVE_MONITORING.md`
- Sign-off register: `docs/SIGN_OFF_REGISTER.md`

## Current Gate Status

- Backend automated tests: passed.
- Frontend lint/typecheck/build: passed.
- Full E2E flow: passed on desktop and mobile.
- Real pilot automated acceptance: passed on desktop and mobile.
- Google login for Alfa onboarding: passed on desktop and mobile.
- Rollback dry-run: passed in local staging-equivalent environment.
- Post-rollback alerts: ok with no active alerts.

## Required Signatures

| Area | Name | Decision | Date | Notes |
| --- | --- | --- | --- | --- |
| Product acceptance | Adriano - MaxiCAD | GO with conditions | 2026-05-26 | Many interface adjustments still expected. |
| BIM/domain acceptance | Adriano - MaxiCAD | GO with conditions | 2026-05-26 | GO aprovado para piloto/Alfa, com ajustes de interface pendentes antes de ampliar uso. |
| Technical release | MaxiCAD | GO | 2026-05-26 | Technical release accepted. |
| Operations/support | Equipe MaxiCAD | GO with conditions | 2026-05-26 | Support channel: `suporte@maxicad.com.br`. |

## Minimum Data Required to Close Production GO

- Product acceptance approver name and decision: closed.
- BIM/domain stakeholder name and decision: closed.
- Technical release owner name and decision: closed.
- Operations/support owner name and decision: closed.
- Approval channel or artifact where the formal decisions are recorded: Codex conversation record, 2026-05-26.
- Support rotation primary and backup names: closed in `docs/POST_GO_LIVE_MONITORING.md`.
- Notification channel for the first 72 hours after go-live: `suporte@maxicad.com.br`.

## Open Conditions Before Production GO

- Triage and validate interface adjustments before expanded use.
- Connect production dashboards/alerts to the target deployment environment.
- Confirm production/staging deployment details not represented in local compose: hostnames, TLS, secrets and image registry rollback.
