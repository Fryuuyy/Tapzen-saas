# TAPZEN MVP — repaired Priority 1 baseline

Multi-tenant B2B SaaS starter for NFC/QR devices, dynamic redirects, business profiles and basic analytics.

## Requirements
- Node.js 20+
- npm 10+
- Docker Desktop (or PostgreSQL 15+)

## Local setup
1. Copy `.env.example` to `.env` and replace both secrets with random values (32+ characters).
2. Start PostgreSQL: `docker compose up -d db`
3. Install dependencies: `npm install`
4. Generate Prisma Client: `npm run db:generate`
5. Apply migration: `npm run db:migrate`
6. Seed demo account: `npm run db:seed`
7. Start apps: `npm run dev`

Web: http://localhost:3000  
API: http://localhost:4000/health  
Public demo profile: http://localhost:3000/p/demo-coffee

Demo login (local development only): `demo@tapzen.kz` / `TapzenDemo2026!`

## API routes
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/organizations`, `POST /api/organizations`
- `GET /api/branches`, `POST /api/branches`
- `GET/POST /api/profiles`, `PATCH /api/profiles/:id`
- `GET /api/profiles/public/:slug`
- `GET/POST/PATCH/DELETE /api/devices`
- `POST /api/devices/:id/rotate-token`
- `GET /r/:token` (accepts explicit `?source=NFC|QR|DIRECT`)
- `GET /api/analytics/summary`
- `POST /api/feedback` (public submission), `GET /api/feedback` (authenticated)

## Security notes
- Every authenticated API request resolves an organization membership. Pass `organizationId` as query parameter or `x-organization-id` header to select among memberships; the server verifies membership before access.
- Tenant ownership is enforced in device/profile/branch queries.
- Redirect destinations accept only absolute `http`, `https`, `tel`, or `mailto` URLs; untrusted protocol-relative URLs are rejected.
- NFC vs QR cannot be reliably inferred from browser User-Agent or Fetch Metadata. Pass `?source=NFC` or `?source=QR` explicitly; requests without a source are counted as `DIRECT`.
- Visitor analytics use HMAC of IP and User-Agent. Configure `ANALYTICS_HASH_SECRET`, minimize retention and disclose analytics processing in your privacy notice.
- Configure `TRUST_PROXY=true` only behind a trusted reverse proxy.
- This is an MVP baseline, not a security certification. Add production logging, monitoring, backups, rate limits tuned to traffic, email verification, password reset, audit review, and a Kazakhstan privacy/legal review before public launch.
- Do not use the demo credentials in production.

## Coarena AI
The dashboard includes `/dashboard/ai` with a chat assistant and text-based PDF analysis.
Configure `COARENA_API_KEY`, `COARENA_BASE_URL=https://coarena.ai/api/v1`, `COARENA_MODEL=gemini-4-argon` and (only after the account owner personally accepts the current Coarena Model API terms) `COARENA_TERMS_ACCEPTED_BY_OWNER=true` in the API server environment. Never expose this key through `NEXT_PUBLIC_*` variables or client-side code.
Endpoints: `POST /api/ai/chat` and `POST /api/ai/pdf/analyze` (authenticated).
The Coarena Model API documentation says it stores every prompt and reply regardless of the client's `store` setting and may use them in datasets it licenses. Do not send sensitive or confidential content. PDF analysis currently supports PDFs with extractable text, not image-only scans.
