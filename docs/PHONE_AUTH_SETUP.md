# TAPZEN phone authentication setup

TAPZEN uses Twilio Verify for SMS one-time passwords (OTP). The application never stores SMS codes or Twilio credentials.

## Required Render environment variables

Set these on the `tapzen-api` service in Render:

- `TWILIO_ACCOUNT_SID` — Twilio Account SID.
- `TWILIO_AUTH_TOKEN` — Twilio Auth Token. Keep it private.
- `TWILIO_VERIFY_SERVICE_SID` — SID of a Twilio Verify Service.

The variables are declared as `sync: false` in `render.yaml`; their secret values must be entered in the Render dashboard. Do not add credentials to GitHub, Vercel, frontend environment variables, or chat messages.

## Twilio setup

1. Create or sign in to a Twilio account.
2. Open Verify in the Twilio Console and create a Verify Service.
3. Enable SMS as a verification channel.
4. Copy the Account SID, Auth Token, and Verify Service SID into the Render environment variables above.
5. Confirm that the destination countries you intend to serve are enabled in Twilio Geo Permissions and that your account has the required billing/sender configuration.
6. Redeploy or restart `tapzen-api` after saving the environment variables.

## API flow

- `POST /api/auth/phone/send` — sends an SMS verification code.
- `POST /api/auth/phone/verify` — checks the code. Existing phone accounts receive a normal TAPZEN session token; new numbers receive a short-lived verification proof.
- `POST /api/auth/phone/register` — creates a new account after successful phone verification.
- `POST /api/auth/phone/link` — attaches a verified phone to an existing authenticated account.

Phone numbers must be in E.164 format, for example `+77001234567`.

## Existing accounts and data safety

The migration makes `User.email` and `User.passwordHash` nullable and adds a unique nullable `User.phone` column. Existing email addresses and password hashes are preserved. Existing users can still use the legacy email/password sign-in option on the login page, then verify and attach a phone number. Their user IDs, memberships, organizations, branches, profiles, devices, and analytics remain associated with the same user records.

The migration is applied by the existing Docker startup command (`prisma migrate deploy`). Do not manually delete or recreate users to enable phone login.
