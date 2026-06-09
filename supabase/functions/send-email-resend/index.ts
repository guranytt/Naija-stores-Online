import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

// CORS Headers for secure multi-origin request support
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  // Handle CORS preflight options request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable in Supabase Vault")
    }

    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      throw new Error("Missing required parameters: 'to', 'subject', or 'html' is blank")
    }

    console.log(`[RESEND EDGE] Preparing to dispatch mail to: ${to} with Subject: "${subject}"`)

    // Call Resend API via Fetch
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Naija Choice <onboarding@resend.dev>",
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[RESEND API FAIL]", result)
      throw new Error(result.message || "Failed to deliver email through Resend REST API")
    }

    console.log("[RESEND EDGE SUCCESS]", result)
    return new Response(
      JSON.stringify({ success: true, message: "Email dispatched successfully", messageId: result.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error("[EDGE CRASH]", error.message || error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown server execution error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
