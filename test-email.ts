import { sendResendEmail } from "./src/emailService";

async function run() {
  console.log("Testing email dispatch...");
  const result = await sendResendEmail({
    to: "adminnaijastoresonline@gmail.com",
    type: "admin_new_user",
    data: {
      customerName: "Test User",
      email: "testuser@example.com",
      role: "customer",
      shopName: ""
    }
  });
  console.log("Result:", result);
  process.exit(0);
}

run();
