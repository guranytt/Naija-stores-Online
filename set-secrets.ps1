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

# Replace these values with your actual secrets before running
$SupabaseUrl = "https://ufndgfhttpbapctkfqab.supabase.co"
$SupabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbmRnZmh0dHBiYXBjdGtmcWFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzQ1MzUzNSwiZXhwIjoyMDk5MDI5NTM1fQ.SAwCd0UAR-FFcvuGIcTHV5bQBRtNOvunUnxwR2B94XU"
$WebhookSecret = "naijastores-secret-webhook-key-2026"
$ResendApiKey = "re_QqipEiBj_8EbsGYocyqnWzt19eKTJqVfv"

Write-Host "Setting secrets for 12 Cloudflare Workers..."

foreach ($worker in $Workers) {
    Write-Host "Configuring $worker..."
    
    # We pipe the secret value into wrangler to avoid the interactive prompt
    Write-Host "  -> SUPABASE_URL"
    cmd /c "echo $SupabaseUrl | npx wrangler secret put SUPABASE_URL --name $worker"
    
    Write-Host "  -> SUPABASE_SERVICE_ROLE_KEY"
    cmd /c "echo $SupabaseServiceRoleKey | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name $worker"
    
    Write-Host "  -> WEBHOOK_SECRET"
    cmd /c "echo $WebhookSecret | npx wrangler secret put WEBHOOK_SECRET --name $worker"
    
    Write-Host "  -> RESEND_API_KEY"
    cmd /c "echo $ResendApiKey | npx wrangler secret put RESEND_API_KEY --name $worker"
}

Write-Host "`nAll secrets configured successfully!" -ForegroundColor Green
