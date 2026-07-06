async function run() {
  const res = await fetch("http://localhost:5173/api/resend/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: "adminnaijastoresonline@gmail.com",
      type: "admin_new_account",
      data: {
        accountType: "customer",
        fullName: "Jane Doe (Test)",
        emailAddress: "janedoe123@example.com",
        phoneNumber: "08012345678",
        userId: "test-user-id",
        registrationDate: new Date().toISOString(),
        adminDashboardLink: "http://localhost:5173?admin=true"
      }
    })
  });
  const text = await res.text();
  console.log("Response:", res.status, text);
}
run();
