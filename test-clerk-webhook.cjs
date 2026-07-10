const { Webhook } = require("svix");

async function testWebhook() {
  const secret = "whsec_5vPBRuNwsiTrXx/s8Je77bfDFdLDzi1C";
  const payload = {
    data: {
      id: "user_test_12345",
      email_addresses: [{ email_address: "test_webhook@example.com" }],
      first_name: "Testy",
      last_name: "McTester",
      public_metadata: { role: "customer" }
    },
    type: "user.created"
  };

  const payloadString = JSON.stringify(payload);
  const wh = new Webhook(secret);
  const headers = wh.sign(payloadString);

  console.log("Sending signed payload to Edge Function...");

  try {
    const fetch = (await import('node-fetch')).default || global.fetch;
    const response = await fetch("https://ufndgfhttpbapctkfqab.supabase.co/functions/v1/clerk-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: payloadString
    });

    const text = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${text}`);
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

testWebhook();
