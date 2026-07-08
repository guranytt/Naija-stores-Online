# Prompt for Antigravity — Resend Email Automation (Database-Triggered Edge Functions)

## Role
You are building the transactional email layer for Naija-Stores-Online using Resend, triggered entirely off database events (Supabase Database Webhooks) rather than being called directly from application code. Each email is its own standalone edge function — deployed as a Cloudflare Worker (consistent with the rest of this project's infrastructure) — so failures, retries, and logs are isolated per email type.
Every function must write to the existing notifications table both before and after sending, so there is a full audit trail and so retried webhook deliveries can't cause duplicate emails.

## 0. Shared Pattern (applies to every function below)
Each edge function must:
1. Receive a Supabase Database Webhook payload (`type`: INSERT/UPDATE, `table`, `record`, `old_record`).
2. Verify the webhook's signing secret before processing.
3. Check `notifications` for an existing row matching `(user_id, type, reference_id)` — if one already exists with `status = 'sent'`, exit without sending (idempotency guard against duplicate webhook deliveries).
4. Insert a `notifications` row with `status = 'queued'`.
5. Call the Resend API.
6. Update the `notifications` row to `status = 'sent'` or `'failed'` (with error detail in `payload`).

Reference `reference_id` should be the relevant row's ID (`order_id`, `payment_id`, etc.) so the idempotency check in step 3 is meaningful.

## 1. Customer Signup Flow

| Function | Trigger (Supabase Webhook on) | Recipient Notes |
|---|---|---|
| **send-customer-confirmation** | `users` INSERT where `role = 'customer'` | New customer. If Clerk's own verification email is still active, confirm with the team whether this duplicates it — if Clerk verification is disabled in favor of a custom flow, this function sends the confirmation link instead. |
| **send-customer-welcome** | `users` UPDATE where `role = 'customer'` AND email verification transitions to verified (this event should come from the existing Clerk webhook → users sync, not directly from Clerk) | New customer. Only fires once, guarded by the idempotency check in §0. |
| **notify-admin-new-customer** | Same trigger as `send-customer-welcome` | Admin(s) — query `users` where `role = 'admin'`. Email body includes the new customer's `full_name`, `email`, `phone`, `created_at`. |

## 2. Vendor Signup Flow

| Function | Trigger (Supabase Webhook on) | Recipient Notes |
|---|---|---|
| **send-vendor-confirmation** | `users` INSERT where `role = 'vendor'` | New vendor. Same caveat as customer confirmation re: Clerk's native verification. |
| **send-vendor-welcome** | `vendors` INSERT (fires once the `vendors` row is created, which per the DB schema happens after email verification via the Clerk webhook sync) | New vendor. Include `business_name` in the email, pull vendor's `user_id` → `users.email`. |
| **notify-admin-new-vendor** | Same trigger as `send-vendor-welcome` | Admin(s). Email body includes `business_name`, `business_address`, `bank details status` (masked), `verification_status`. *Design note to resolve:* confirm whether `vendors` rows are created immediately at signup (before verification) or only after — this determines whether `send-vendor-welcome` should trigger on `vendors` INSERT or on a `vendors.verification_status` change. Check the actual insert timing in the Clerk webhook handler before wiring this up. |

## 3. Payment Confirmation Flow
Triggered by `payments` UPDATE where `status` transitions to `'success'`.

| Function | Recipient Notes |
|---|---|
| **notify-vendors-of-sale** | Every distinct `vendor_id` found in `order_items` for that `payment_id`'s `order_id`. Group `order_items` by `vendor_id` first — a single payment can span multiple vendors. Each vendor gets one email listing only their `product_id`s, quantities, and line totals from that order — not the full order. |
| **send-customer-payment-confirmation** | The `orders.customer_id` → `users.email`. Include `order_number`, `subtotal`, itemized list, estimated delivery info if available. |
| **notify-admin-payment** | Admin(s). Include `paystack_reference`, `amount`, `order_number`, `vendor(s)` involved, commission total from `commission_ledger`. |

*Idempotency is critical here* — Paystack webhooks can retry, and this same `payments.status = 'success'` event is what also creates the order (per the earlier order-creation fix). Make sure this trigger fires on the transaction that finalizes the order, not on every webhook retry attempt.

## 4. Order Status Flow
Recall: fulfillment status lives at `order_items.fulfillment_status`, per vendor per item, not at the `orders` level (since one order can span vendors).

| Function | Trigger | Recipient Notes |
|---|---|---|
| **notify-order-confirmed** | `orders` INSERT (i.e., right after successful payment creates the order) | Customer. This can likely be merged with `send-customer-payment-confirmation` above rather than duplicated — decide during implementation whether "payment confirmed" and "order confirmed" are the same customer-facing email or two. |
| **notify-item-shipped** | `order_items` UPDATE where `fulfillment_status` transitions to `'shipped'` | Customer. Email should reference only the specific items that vendor just marked shipped, not the whole order — since a multivendor order ships in parts. Include vendor's business name so the customer knows who shipped what. |
| **notify-item-delivered** | `order_items` UPDATE where `fulfillment_status` transitions to `'delivered'` | Customer. Same per-item logic as shipped. Consider whether to also send one final "your order is complete" email once all `order_items` for that `order_id` reach `'delivered'` — if so, that's a separate function (**notify-order-complete**) that checks sibling rows before sending. |

*Design decision to make explicit in the build:* since multivendor orders ship/deliver in stages, decide (and document) whether the customer gets one email per vendor-shipment event (more granular, more emails) or a debounced/aggregated email once per status per order (fewer emails, more complex logic checking sibling `order_items` rows). Default to per-vendor-event unless told otherwise — it's simpler and matches the granularity already in the schema.

## 5. Supabase Database Webhook Configuration Required
For each trigger above, configure a Database Webhook (Database → Webhooks in Supabase dashboard, or via SQL trigger + `pg_net`) on:
- `users` (INSERT, UPDATE)
- `vendors` (INSERT, UPDATE)
- `payments` (UPDATE)
- `order_items` (UPDATE)
- `orders` (INSERT)

Each webhook should point to its corresponding Cloudflare Worker URL, one per function listed above — not one shared endpoint with internal branching, per the "separate edge function per email" requirement.

## 6. Deliverables Requested from Antigravity
1. One Cloudflare Worker file per function listed above (11–12 functions total), each following the shared pattern in §0.
2. SQL for the Supabase Database Webhook configuration (or trigger + `pg_net` calls) wiring each table event to its Worker URL.
3. A migration adding a UNIQUE `(user_id, type, reference_id)` constraint on `notifications` to enforce the idempotency guard at the database level, not just in application code.
4. Explicit resolution of the two open design questions flagged above (vendor row creation timing; per-event vs. aggregated shipment/delivery emails) — document the decision made in code comments.
5. Resend email templates (plain-text acceptable for v1) for all customer-, vendor-, and admin-facing emails listed in the tables above.
