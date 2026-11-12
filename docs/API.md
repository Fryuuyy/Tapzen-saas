# API reference

Base URL: `http://localhost:4000`

Authenticated endpoints require `Authorization: Bearer <JWT>`.

## Auth
- POST `/api/auth/register` `{email,name,password}`
- POST `/api/auth/login` `{email,password}`
- GET `/api/auth/me`

## Organizations
- GET `/api/organizations`
- POST `/api/organizations` `{name,slug}`

## Branches
- GET `/api/branches?organizationId=...`
- POST `/api/branches` `{organizationId,name,address?}`

## Profiles
- GET `/api/profiles?organizationId=...`
- POST `/api/profiles` `{organizationId,branchId?,slug,title,description?,locale,links:[{label,url}]}`
- PATCH `/api/profiles/:id` `{title?,description?,links?,isPublished?}`
- GET `/public/profiles/:slug` public restricted projection

## Devices
- GET `/api/devices?organizationId=...`
- POST `/api/devices` `{organizationId,branchId?,profileId?,slug,label,source,destinationUrl}`
- POST `/api/devices/:id/rotate-token`
- GET `/r/:slug` public redirect

## Analytics and feedback
- GET `/api/analytics/summary?organizationId=...`
- POST `/api/feedback` `{organizationId,branchId?,name?,contact?,message}`
- GET `/api/feedback?organizationId=...`
- PATCH `/api/feedback/:id` `{status}`
