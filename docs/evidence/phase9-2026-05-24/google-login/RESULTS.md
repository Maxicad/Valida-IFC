# Phase 9 Evidence - Google Login for Alfa Onboarding

Date: 2026-05-24
Timezone: America/Sao_Paulo
Scope: Implement and validate Google login for Alfa onboarding.
Decision: GO for Google login gate; production GO still blocked by stakeholder sign-off and named support rotation/channel.

## Implementation evidence

- Backend endpoint added: `POST /auth/google`.
- Google ID token validation added with JWKS signature verification, audience check, issuer check, verified e-mail requirement and optional hosted-domain allowlist.
- Existing e-mail/password login preserved.
- Google-created users receive the existing internal JWT used by protected API routes.
- Frontend login page now renders Google Identity Services only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured.
- E2E config passes `NEXT_PUBLIC_GOOGLE_CLIENT_ID` into the web server when set.

## Validation executed

- `docker compose build api`
  - Result: passed; API image rebuilt with Google login changes.
- `docker compose run --rm --no-deps api pytest apps/api/tests -q`
  - Result: passed, 27 tests.
  - Covered Google login user creation, internal JWT issuance, verified e-mail requirement and password-login rejection for Google-only account.
- `corepack pnpm --filter @valida-ifc/web lint`
  - Result: passed.
- `corepack pnpm --filter @valida-ifc/web typecheck`
  - Result: passed.
- `corepack pnpm --filter @valida-ifc/web build`
  - Result: passed.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-alpha-client corepack pnpm --filter @valida-ifc/web e2e e2e/google-login.spec.ts --project chromium-desktop`
  - Result: passed, 1 test.
  - Covered Google button render, credential callback, `POST /auth/google`, JWT storage and dashboard redirect.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=google-alpha-client corepack pnpm --filter @valida-ifc/web e2e e2e/google-login.spec.ts --project chromium-mobile`
  - Result: passed, 1 test.
  - Covered the same onboarding path on mobile viewport.
- `corepack pnpm e2e`
  - Result: passed, 6 tests; 4 conditional tests skipped without required env vars.
  - Confirmed existing e-mail/password onboarding and full audit journey still work on desktop and mobile.

## Remaining production GO blockers

- Stakeholder sign-off must be formally recorded.
- Named support rotation and notification channel must be activated.
