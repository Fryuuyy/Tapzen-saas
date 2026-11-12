# Database model

Core entities:
- User
- Organization
- Membership
- Branch
- Profile
- Device
- ScanEvent
- Feedback

Tenant-owned entities carry organizationId. Slugs are globally unique in this MVP. For larger scale, use a tenant-scoped composite unique key where public routing requirements permit.

Important production additions:
- Subscription, Invoice, PaymentAttempt, PaymentWebhookEvent
- ConsentRecord and DataRetentionPolicy
- AuditLog
- Menu, MenuCategory, MenuItem
- LoyaltyAccount, LoyaltyTransaction
- StaffInvite
- Device lifecycle state and ownership transfer audit
