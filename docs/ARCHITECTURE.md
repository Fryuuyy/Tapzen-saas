# Architecture

## Deployment topology
Browser/PWA → Next.js web → Express API → PostgreSQL.
The redirect endpoint is served by the API to keep redirect tracking independent of the dashboard.
Public profile route reads a restricted projection from the API.

## Tenant model
Organization is the tenant boundary. Membership joins users to organizations with roles. All tenant-owned records include organizationId. API handlers check membership before read/write. Production hardening should add PostgreSQL RLS policies and centralize authorization in service functions.

## Modules
- Identity: registration, login, JWT.
- Tenancy: organizations, memberships, branches.
- Profile: public business landing pages.
- Devices: NFC/QR identifier and destination.
- Redirect: event tracking and redirect.
- Analytics: aggregate event counts.
- Feedback: public submissions and private management.

## Production evolution
- Move redirect events to partitioned table or event queue as volume grows.
- Add Redis for rate limits, caching and background jobs.
- Add object storage for logos/menu images.
- Add email verification and password-reset provider.
- Add billing provider through a provider adapter and signed webhook verification.
- Add audit log for admin and staff actions.
- Add monitoring, tracing, backups and restore drills.
