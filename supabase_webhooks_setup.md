# Supabase Database Webhooks Configuration Specifications

Since you want to configure these native webhooks through the **Supabase Dashboard** (Database -> Webhooks) instead of raw SQL triggers, follow the specifications below for each of the 12 email triggers.

## Global Configuration Headers
Every webhook must be configured with the following headers:
- `Content-Type`: `application/json`
- `Authorization`: `Bearer YOUR_WEBHOOK_SECRET`
*(Make sure the `YOUR_WEBHOOK_SECRET` value matches the `WEBHOOK_SECRET` environment variable defined on your Cloudflare Workers).*

---

### 1. Send Customer Confirmation Email
- **Name:** `send-customer-confirmation`
- **Table:** `users`
- **Events:** `INSERT`
- **Filter (optional):** Only trigger where `role = 'customer'` (if your dashboard allows condition filters, otherwise the worker code itself checks this).
- **Target URL:** `https://send-customer-confirmation.YOUR-DOMAIN.workers.dev`

### 2. Send Customer Welcome Email
- **Name:** `send-customer-welcome`
- **Table:** `users`
- **Events:** `INSERT` *(Triggers immediately upon signup as requested)*
- **Filter:** `role = 'customer'`
- **Target URL:** `https://send-customer-welcome.YOUR-DOMAIN.workers.dev`

### 3. Notify Admin of New Customer
- **Name:** `notify-admin-new-customer`
- **Table:** `users`
- **Events:** `INSERT`
- **Filter:** `role = 'customer'`
- **Target URL:** `https://notify-admin-new-customer.YOUR-DOMAIN.workers.dev`

### 4. Send Vendor Confirmation Email
- **Name:** `send-vendor-confirmation`
- **Table:** `users`
- **Events:** `INSERT`
- **Filter:** `role = 'vendor'`
- **Target URL:** `https://send-vendor-confirmation.YOUR-DOMAIN.workers.dev`

### 5. Send Vendor Welcome Email
- **Name:** `send-vendor-welcome`
- **Table:** `vendors`
- **Events:** `INSERT`
- **Target URL:** `https://send-vendor-welcome.YOUR-DOMAIN.workers.dev`

### 6. Notify Admin of New Vendor
- **Name:** `notify-admin-new-vendor`
- **Table:** `vendors`
- **Events:** `INSERT`
- **Target URL:** `https://notify-admin-new-vendor.YOUR-DOMAIN.workers.dev`

### 7. Notify Vendors of Sale
- **Name:** `notify-vendors-of-sale`
- **Table:** `payments`
- **Events:** `UPDATE`
- **Target URL:** `https://notify-vendors-of-sale.YOUR-DOMAIN.workers.dev`

### 8. Send Customer Payment Confirmation
- **Name:** `send-customer-payment-confirmation`
- **Table:** `payments`
- **Events:** `UPDATE`
- **Target URL:** `https://send-customer-payment-confirmation.YOUR-DOMAIN.workers.dev`

### 9. Notify Admin of Payment Settlement
- **Name:** `notify-admin-payment`
- **Table:** `payments`
- **Events:** `UPDATE`
- **Target URL:** `https://notify-admin-payment.YOUR-DOMAIN.workers.dev`

### 10. Notify Item Shipped
- **Name:** `notify-item-shipped`
- **Table:** `order_items`
- **Events:** `UPDATE`
- **Target URL:** `https://notify-item-shipped.YOUR-DOMAIN.workers.dev`

### 11. Notify Item Delivered
- **Name:** `notify-item-delivered`
- **Table:** `order_items`
- **Events:** `UPDATE`
- **Target URL:** `https://notify-item-delivered.YOUR-DOMAIN.workers.dev`

### 12. Notify Order Complete
- **Name:** `notify-order-complete`
- **Table:** `order_items`
- **Events:** `UPDATE`
- **Target URL:** `https://notify-order-complete.YOUR-DOMAIN.workers.dev`
