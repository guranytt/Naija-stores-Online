# Supabase + Resend Email System 🚀

This repository now contains a complete, production-ready enterprise email notification system using Supabase Edge Functions and Resend.

## Folder Structure

\`\`\`text
supabase/
├── functions/
│   └── send-email-resend/
│       └── index.ts     (Deno Edge Function handling all email logic)
├── migrations/
│   └── 2026101400000_email_logs.sql (SQL Schema for email_logs table)
└── README.md
\`\`\`

## Environment Variables
Ensure the following are set in your Supabase project dashboard (Settings -> Edge Functions -> Secrets):

- \`RESEND_API_KEY\`: Your Resend API credential.
- \`SUPABASE_URL\`: Your Project URL.
- \`SUPABASE_ANON_KEY\`: For edge permissions.
- \`SUPABASE_SERVICE_ROLE_KEY\`: Used inside the Edge function to securely write to the \`email_logs\` table bypassing RLS.

## Features

- **Duplicate Prevention:** Supabase Edge logs check for identical \`email\` and \`template_name\` combinations sent within the last 60 seconds.
- **Failover & Retries:** Automatic API failure exponential backoff retries handling status codes 429 and 5xx.
- **Postgres Webhook Triggers:** Out-of-the-box compatibility with Database Webhooks for zero-frontend triggering (like Signup to Welcome email).

## Available React Helpers / Templates (src/emailService.ts)
The frontend UI wraps Edge invocation efficiently for:
- Welcome Emails
- Email Verifications
- Password Resets
- Order Received Confirmations
- Payment Confirmations
- Order Shipped Tracking Updates
- Packages Delivered and Refund Processing

## Deployment Instructions

To push the function out to production:
\`\`\`sh
# Push edge function
supabase functions deploy send-email-resend --no-verify-jwt

# Push migrations
supabase db push
\`\`\`
