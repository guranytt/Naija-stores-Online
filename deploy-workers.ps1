$ErrorActionPreference = "Stop"

$Workers = @(
    "notify-admin-new-customer",
    "notify-admin-new-vendor",
    "notify-admin-payment",
    "notify-item-delivered",
    "notify-item-shipped",
    "notify-order-complete",
    "notify-vendors-of-sale",
    "send-customer-confirmation",
    "send-customer-payment-confirmation",
    "send-customer-welcome",
    "send-vendor-confirmation",
    "send-vendor-welcome"
)

Write-Host "Deploying 12 Cloudflare Workers..."

foreach ($worker in $Workers) {
    Write-Host "`n----------------------------------------"
    Write-Host "Deploying $worker..."
    Write-Host "----------------------------------------"
    
    # Run the wrangler deploy command with the required compatibility-date
    npx wrangler deploy "worker/resend/$worker.ts" --name $worker --compatibility-date 2026-07-08
}

Write-Host "`nAll workers deployed successfully!"
Write-Host "`nIMPORTANT: You still need to set your secrets for each worker."
Write-Host "To do this for a specific worker, run:"
Write-Host "npx wrangler secret put SUPABASE_URL --name <worker-name>"
Write-Host "npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name <worker-name>"
Write-Host "npx wrangler secret put WEBHOOK_SECRET --name <worker-name>"
Write-Host "npx wrangler secret put RESEND_API_KEY --name <worker-name>"
