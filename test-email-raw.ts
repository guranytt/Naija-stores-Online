const supabaseUrl = "https://jmmfogjefenmjqspspyg.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbWZvZ2plZmVubWpxc3BzcHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjkwODEsImV4cCI6MjA5NjI0NTA4MX0.ah-wpbhIJKcF9fs4UVpXCAVwq5Bw10aTNPdtJxyPg3M";

async function testEmail() {
  console.log("Invoking Supabase Edge Function...");
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email-resend`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: "adminnaijastoresonline@gmail.com",
        template_name: "admin_new_user",
        data: {
          customerName: "Test User From AI",
          email: "aitester@example.com",
          role: "customer",
          shopName: ""
        }
      })
    });
    
    // Some Edge Functions might return empty response on 200, so check status first
    console.log("Status Code:", res.status);
    const text = await res.text();
    console.log("Response Body:", text);
    
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testEmail();
