import fetch from 'node-fetch';

async function test() {
  try {
    const payload = {
      id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      user_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      business_name: "Test API Upsert Shop",
      owner_name: "John Doe",
      email: "test_api_upsert@example.com",
      phone: "1234567890",
      physical_location: "Lagos, Nigeria"
    };

    console.log("Sending payload:", payload);
    const res = await fetch("http://localhost:3000/api/vendor/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", json);
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
