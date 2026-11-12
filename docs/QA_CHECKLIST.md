# QA checklist for local verification

Run these commands from the repository root after copying `.env.example` to `.env`:

```bash
npm install
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
npm test
```

Manual checks:
1. Log in with the local demo credentials.
2. Open `/dashboard`; verify organizations and summary load.
3. Open `/p/demo-coffee`; verify public profile and links render.
4. Scan `http://localhost:4000/r/<device-token>?source=NFC`; verify redirect to the public profile and one scan event is recorded.
5. Repeat with `?source=QR`; verify QR source count increments.
6. Create a second organization/user and verify that using the first organization's UUID in `organizationId` returns 403.
7. Attempt to update/delete a device from another tenant; verify 404.
8. Try destination values such as `javascript:alert(1)` and `//evil.example`; verify validation rejects them.

The checks above are instructions, not claims that they have already passed.
