# TAPZEN deployment status

## Current repository state

This repository was created and initialized through the GitHub connector. The current source tree has not yet been imported from the local TAPZEN project workspace. Do not deploy this repository as the production application until the full monorepo source has been committed.

## Target architecture

- Frontend: Next.js app in `apps/web`, deployed on Vercel.
- API: Express service in `apps/api`, deployed as a separate Node service unless it is deliberately migrated to Vercel Functions.
- Database: managed PostgreSQL with Prisma migrations.
- AI provider: Coarena, server-side only; keep `COARENA_TERMS_ACCEPTED_BY_OWNER=false` until the account owner personally reviews and accepts the current provider terms.

## Required Vercel configuration after source import

Set the Vercel project's Root Directory to `apps/web` only if deploying the frontend app independently. Configure `NEXT_PUBLIC_API_URL` to the HTTPS URL of the separately deployed API. Never put provider keys or database credentials in `NEXT_PUBLIC_*` variables.

## Required API environment variables

`DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `COARENA_API_KEY`, `COARENA_BASE_URL`, `COARENA_MODEL`, `COARENA_TERMS_ACCEPTED_BY_OWNER`.

Use a fresh JWT secret and a newly rotated Coarena key. Do not commit `.env` files or secrets.

## Verification gate

Before production traffic: install from lockfile, run Prisma validate/generate/migrations against a clean database, run backend tests and both production builds, verify tenant isolation, and smoke-test auth, profile, redirect, analytics and AI endpoints. Record actual command output; do not mark unrun checks as passed.
