# Priority 1 repair report

## Implemented in this revision
- Added Prisma schema for users, organizations, memberships, branches, profiles, devices, scan events, feedback and audit logs.
- Replaced broken auth imports with an Express auth router, JWT validation, password hashing, organization membership resolution and role middleware.
- Added organization and branch endpoints required by the dashboard/API contract.
- Reworked device CRUD around the schema's `label` field and tenant-scoped lookups.
- Added public profile API and Next.js public profile page at `/p/:slug`.
- Redirect route now targets the working public profile page, validates destination protocols, uses explicit source attribution and writes scan events asynchronously.
- Analytics now exposes `/api/analytics/summary`, returns the dashboard's expected summary/recent structure and formats dates in Asia/Almaty.
- Added env template, Postgres compose service, Jest/Supertest baseline tests and updated run documentation.

## Known limitations / not production-ready
- Password reset, email verification, billing, super-admin console, organization invitations, full admin audit UI and advanced analytics are not implemented.
- Unique visitors are distinct HMAC identifiers over the selected report period; they are not a mathematically exact sliding 24-hour deduplication counter.
- NFC/QR attribution must be explicit in the link (`?source=NFC` / `?source=QR`). Browser headers do not reliably identify the physical scan method.
- The public feedback endpoint requires an organization UUID; production should use a signed public form token or profile slug with anti-spam controls.
- Prisma migration is generated from this schema and must be applied against a clean or compatible database.
- Build/test status is documented separately and must be re-run in the target deployment environment.

## Coarena AI integration
- Added a server-only OpenAI-compatible Coarena client.
- Default model: `gemini-4-argon`; configurable by environment.
- Added authenticated chat endpoint and PDF text extraction/analysis endpoint.
- Added Dashboard AI workspace at `/dashboard/ai`.
- The API key is read only by the backend. No key value is included in the source archive.
- Coarena's documentation states that prompts/replies are stored and may be used in licensed datasets; the UI warns users not to submit sensitive information.

## AI business analytics
- Added `/api/ai/business-insights`, scoped to the authenticated organization.
- The payload sent to Coarena contains aggregate scan counts by source/day, device counts and feedback status counts only.
- It deliberately excludes customer names, phone/email contacts, raw IP addresses, feedback message text and individual device IDs.
- AI routes have a tighter request rate limit than ordinary API routes.

## Provider activation gate and privacy
- Model API calls are blocked unless `COARENA_TERMS_ACCEPTED_BY_OWNER=true`.
- This flag is an owner-controlled deployment acknowledgement, not an automated acceptance of Coarena's legal terms. The account owner must personally review and accept the current terms in Coarena first.
- Coarena's published Model API terms state that prompts/replies are stored, may be used in datasets it licenses, cannot be withdrawn later, and Model API use is for adults 18+.
- TAPZEN sends only aggregate organization metrics for AI business insights; no customer names, contacts, free-text feedback, raw IPs or individual device identifiers are included.
