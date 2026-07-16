const vendor = {
  id: "123",
  user_id: "456",
  business_name: "Test Business",
  business_address: "123 Test St",
  // Let's see what happens if verification_status is not set (e.g. if the webhook payload misses it)
};

try {
  console.log(vendor.verification_status.toUpperCase());
} catch (e) {
  console.error("Error:", e.message);
}
