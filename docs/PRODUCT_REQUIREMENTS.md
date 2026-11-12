# TAPZEN MVP — Product Requirements Document

## Product objective
Launch a multilingual, multi-tenant SaaS platform for SMEs in Kokshetau and Akmola Region. Physical NFC/QR products are acquisition channels; recurring software value comes from business profiles, dynamic redirects, analytics and feedback management.

## Personas
1. Owner: manages organization, branches, profiles, devices and feedback.
2. Manager: operational access within an organization (role groundwork included).
3. Staff: future restricted access.
4. TAPZEN operator: support and platform administration (separate privileged admin auth is a production requirement).

## MVP user journeys
- Visitor taps an NFC tag or scans QR → TAPZEN records redirect event → visitor reaches published profile or configured destination.
- Owner signs in → selects organization → views scans/devices/feedback summary.
- Owner creates organization and branch.
- Owner creates profile with contact/social links and publishes it.
- Owner registers device with source NFC or QR and receives redirect URL.
- Visitor submits feedback; authorized organization member reviews and updates status.

## Functional requirements
- Email/password registration and login.
- Passwords hashed with bcrypt.
- JWT authentication with 7-day expiry.
- Organization membership isolation.
- Organization and branch management.
- Public profile by slug.
- Device registration and dynamic redirect.
- Scan event logging.
- Basic analytics summary.
- Feedback submission and status management.
- Responsive dashboard and PWA manifest.
- Locale dictionaries for kk, ru, en.

## Non-functional requirements
- HTTPS in production.
- Validate all input server-side.
- Rate-limit authentication and API.
- Helmet security headers.
- Organization membership checked for tenant data.
- Database backups and tested restore.
- Structured logs and error monitoring before production.
- Avoid collecting unnecessary personal data.
- Do not store payment-card details.
- WCAG-oriented contrast and keyboard access in full UI implementation.

## Acceptance criteria
- A user can register and log in.
- A user can create an organization and branch.
- A user can create and publish a public profile.
- A user can register an NFC or QR device.
- Opening `/r/:slug` creates an event and redirects.
- A user from another organization cannot read tenant resources.
- Analytics returns only events belonging to the selected organization.
- Feedback can be submitted publicly and managed by the organization.
- Public profile exposes only intended fields.
- The web app is responsive and can be installed where browser PWA support allows.
