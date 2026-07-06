import { sendAdminNotificationEmail } from "./server/emailServices.js";

async function run() {
  try {
    console.log("Testing sendAdminNotificationEmail directly...");
    const result = await sendAdminNotificationEmail("testuser123@example.com", "customer", "John Testman");
    console.log("Success:", result.success);
    console.log("Result:", result);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}
run();
