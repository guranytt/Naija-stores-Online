import { Resend } from "resend";
const resend = new Resend("re_123456789");
resend.emails.send({
  from: "orders@naijaonlinestores.com.ng",
  to: "test@example.com",
  subject: "Test",
  html: "<h1>Test</h1>"
}).then(res => console.log("Result:", res)).catch(err => console.error("Error:", err));
