export function baseWrap(title: string, content: string) {
  return `
  <div style="font-family: 'Inter', system-ui, sans-serif; padding: 40px 20px; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #f1f5f9;">
    <div style="text-align: center; border-bottom: 2px solid #f97316; padding-bottom: 24px; margin-bottom: 32px;">
      <h1 style="color: #0f172a; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">Naija Online Stores</h1>
      <p style="color: #f97316; margin: 8px 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${title}</p>
    </div>
    <div style="color: #334155; font-size: 16px; line-height: 1.6;">
      ${content}
    </div>
    <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 13px;">
      <p style="margin: 0;">Support: admin@naijaonlinestores.com.ng | Phone: +234 800 000 0000</p>
      <p style="margin: 6px 0 0;">© ${new Date().getFullYear()} Naija Online Stores. All rights reserved.</p>
    </div>
  </div>`;
}

export function getTemplate(templateType: string, data: any, name: string) {
  let subject = "";
  let html = "";
  switch (templateType) {
    case "welcome":
      subject = "Welcome to Naija Online Stores! 🎉";
      html = baseWrap("Welcome Aboard", `
        <p>Hi <strong>${name}</strong>,</p>
        <p>Welcome to Naija Online Stores! We are thrilled to have you join our marketplace.</p>
        <p>Get ready to explore the best local and international products, authentic fashion, and direct-from-vendor deals.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://ais-dev-brqsexjwpwzbfwju74h6mt-9956629845.europe-west2.run.app/" style="background-color: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Start Shopping Now</a>
        </div>
      `);
      break;

    case "email_verification":
      subject = "Verify Your Email Address";
      html = baseWrap("Account Security", `
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thanks for registering! Please verify your email address to secure your account and unlock all marketplace features.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.verificationLink || '#'}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Verify Email Address</a>
        </div>
        <p style="font-size: 13px; color: #64748b;"><em>Note: This link expires in 24 hours.</em></p>
      `);
      break;

    case "password_reset":
      subject = "Password Reset Request";
      html = baseWrap("Account Recovery", `
        <p>Hi <strong>${name}</strong>,</p>
        <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.resetLink || '#'}" style="background-color: #ef4444; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #ef4444; border-left: 3px solid #ef4444; padding-left: 12px;"><strong>Security Warning:</strong> Never share your reset link with anyone.</p>
      `);
      break;

    case "order_received":
      subject = `Order Received #${data.orderNumber}`;
      html = baseWrap("Order Received 📦", `
        <p>Hi <strong>${name}</strong>,</p>
        <p>Thank you for shopping with us! Your order has been received and is currently being processed.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin:0 0 8px;"><strong>Order Number:</strong> #${data.orderNumber}</p>
          <p style="margin:0 0 8px;"><strong>Order Date:</strong> ${new Date(data.date || Date.now()).toLocaleDateString()}</p>
          <p style="margin:0 0 8px;"><strong>Total Amount:</strong> ₦${Number(data.amount || 0).toLocaleString()}</p>
          <p style="margin: 16px 0 8px;"><strong>Items Ordered:</strong></p>
          <ul style="margin:0; padding-left: 20px;">${data.itemsHtml}</ul>
        </div>
        <p>Estimated processing time: <strong>1-2 business days</strong>.</p>
      `);
      break;

    case "payment_confirmation":
      subject = `Payment Confirmed - Order #${data.orderNumber}`;
      html = baseWrap("Payment Successful 🎉", `
        <p>Hi <strong>${name}</strong>,</p>
        <p>We've successfully processed your payment.</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin:0 0 8px;"><strong>Transaction ID:</strong> ${data.transactionId || 'TXN-' + Date.now()}</p>
          <p style="margin:0 0 8px;"><strong>Amount Paid:</strong> ₦${Number(data.amount || 0).toLocaleString()}</p>
          <p style="margin:0 0 8px;"><strong>Payment Method:</strong> ${data.paymentMethod || 'Paystack'}</p>
          <p style="margin:0 0 0;"><strong>Order Number:</strong> #${data.orderNumber}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.receiptLink || '#'}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">View Full Receipt</a>
        </div>
      `);
      break;

    case "order_shipped":
      subject = `Your Order #${data.orderNumber} is on the way! 🚚`;
      html = baseWrap("Order Shipped", `
        <p>Hi <strong>${name}</strong>,</p>
        <p>Great news! Your order <strong>#${data.orderNumber}</strong> has been shipped.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin:0 0 8px;"><strong>Courier Partner:</strong> ${data.courier || 'Naija Logistics Core'}</p>
          <p style="margin:0 0 8px;"><strong>Tracking Number:</strong> ${data.trackingNumber || 'PENDING'}</p>
          <p style="margin:0 0 0;"><strong>Expected Delivery:</strong> ${data.expectedDelivery || '2-4 Business Days'}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.trackingUrl || '#'}" style="background-color: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Track Shipment Live</a>
        </div>
      `);
      break;

    case "order_delivered":
      subject = `Order #${data.orderNumber} Delivered ✅`;
      html = baseWrap("Package Delivered", `
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your order <strong>#${data.orderNumber}</strong> has been successfully delivered! We hope you love your new items.</p>
        <p>We'd love to hear about your experience. Please take a moment to review your purchase.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.reviewUrl || '#'}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Leave a Review</a>
        </div>
      `);
      break;

    case "refund_processed":
      subject = `Refund Processed - Order #${data.orderNumber}`;
      html = baseWrap("Refund Processed 💸", `
        <p>Hi <strong>${name}</strong>,</p>
        <p>We have successfully processed a refund for your order.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin:0 0 8px;"><strong>Refund Amount:</strong> ₦${Number(data.amount || 0).toLocaleString()}</p>
          <p style="margin:0 0 8px;"><strong>Refund Reference:</strong> ${data.refundReference || 'REF-' + Date.now()}</p>
          <p style="margin:0 0 0;"><strong>Order Number:</strong> #${data.orderNumber}</p>
        </div>
        <p>Please note: It may take <strong>3-5 business days</strong> for the funds to settle in your account depending on your bank.</p>
      `);
      break;

    case "user_signup":
      subject = `New User Registration - ${data.fullName || "User"}`;
      html = baseWrap("New User Registration", `
        <p>A new user has just registered on the platform.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin:0 0 8px;"><strong>Full Name:</strong> ${data.fullName || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Email Address:</strong> ${data.email || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Phone Number:</strong> ${data.phone || 'Not provided'}</p>
          <p style="margin:0 0 8px;"><strong>Registration Date:</strong> ${new Date(data.registrationDate || Date.now()).toLocaleString()}</p>
          <p style="margin:0 0 0;"><strong>User ID:</strong> ${data.userId || 'N/A'}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.adminDashboardLink || 'https://ais-dev-brqsexjwpwzbfwju74h6mt-9956629845.europe-west2.run.app/admin'}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">View in Admin Dashboard</a>
        </div>
      `);
      break;

    case "vendor_signup":
      subject = `New Vendor Registration - ${data.businessName || "Vendor"}`;
      html = baseWrap("New Vendor Registration Alert", `
        <p>A new vendor has applied to join the marketplace.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin:0 0 8px;"><strong>Business Name:</strong> ${data.businessName || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Owner Name:</strong> ${data.ownerName || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Email Address:</strong> ${data.email || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Phone Number:</strong> ${data.phone || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Business Address:</strong> ${data.businessAddress || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Category:</strong> ${data.category || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Registration Date:</strong> ${new Date(data.registrationDate || Date.now()).toLocaleString()}</p>
          <p style="margin:0 0 8px;"><strong>Vendor ID:</strong> ${data.vendorId || 'N/A'}</p>
          <p style="margin:0 0 0;"><strong>Approval Status:</strong> <span style="font-weight:bold; color: #d97706;">${data.approvalStatus || 'pending'}</span></p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.adminDashboardLink || 'https://ais-dev-brqsexjwpwzbfwju74h6mt-9956629845.europe-west2.run.app/admin'}" style="background-color: #f97316; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Review Vendor Application</a>
        </div>
      `);
      break;

    case "admin_new_account":
      subject = `New ${data.accountType || "Account"} Registration - ${data.fullName || "User"}`;
      html = baseWrap("New Registration Alert", `
        <p>A new ${data.accountType || "account"} has just registered on the platform.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="margin:0 0 8px;"><strong>Full Name:</strong> ${data.fullName || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Email Address:</strong> ${data.emailAddress || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Phone Number:</strong> ${data.phoneNumber || 'N/A'}</p>
          <p style="margin:0 0 8px;"><strong>Account Type:</strong> <span style="text-transform: capitalize;">${data.accountType || 'user'}</span></p>
          ${data.businessName ? `<p style="margin:0 0 8px;"><strong>Business Name:</strong> ${data.businessName}</p>` : ''}
          <p style="margin:0 0 8px;"><strong>Registration Date:</strong> ${new Date(data.registrationDate || Date.now()).toLocaleString()}</p>
          <p style="margin:0 0 8px;"><strong>User ID:</strong> ${data.userId || 'N/A'}</p>
          <p style="margin:0 0 0;"><strong>Sign In Provider:</strong> ${data.signInProvider || 'Email/Password'}</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${data.adminDashboardLink || '#'}" style="background-color: #0f172a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">View Profile in Admin Dashboard</a>
        </div>
      `);
      break;

    default:
      subject = `Important Update from Naija Online Stores`;
      html = baseWrap("Notification", `<p>${data.customMessage || "You have a new alert."}</p>`);
      break;
  }
  return { subject, html };
}
