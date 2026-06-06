/**
 * Production-Ready Transactional Email Templates for Resend Integration
 * Designed with elegant typography, high contrast buttons, responsive tables, 
 * and perfect visual hierarchy. Compatible with Gmail, Outlook, and Apple Mail.
 */

export interface EmailTemplateData {
  customerName: string;
  orderId: string;
  amount?: number;
  items?: Array<{ name: string; qty: number; price: number }>;
  date?: string;
  supportLink?: string;
  actionUrl?: string;
  alertReason?: string;
  oldStatus?: string;
  newStatus?: string;
  address?: string;
}

/**
 * 1. Elite Invoice & Payments Template
 * A premium slate-based order confirmation template with a high-contrast itemized breakdown.
 */
export function generateInvoiceTemplate(data: EmailTemplateData): string {
  const { customerName, orderId, amount = 0, items = [], date = new Date().toLocaleDateString(), actionUrl = "#" } = data;
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: left; color: #1e293b; font-weight: 500;">
        ${item.name} <span style="color: #64748b; font-size: 11px;">x${item.qty}</span>
      </td>
      <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #0f172a; font-weight: bold; font-family: monospace;">
        ₦${(item.price * item.qty).toLocaleString()}
      </td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - Order ${orderId}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
          
          <!-- Master Ribbon Colorways -->
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
            <tr>
              <td style="background-color: #008751; height: 5px; width: 33.3%;"></td>
              <td style="background-color: #ffffff; height: 5px; width: 33.3%;"></td>
              <td style="background-color: #008751; height: 5px; width: 33.3%;"></td>
            </tr>
          </table>

          <!-- Brand Header Banner -->
          <div style="background-color: #0f172a; padding: 40px 32px; text-align: center;">
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #10b981; font-weight: 800; margin: 0 0 8px 0;">Premium Escrow Network</p>
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 950; letter-spacing: -0.03em;">NaijaStores Plaza</h1>
          </div>

          <!-- Primary Body and Copy -->
          <div style="padding: 40px 32px;">
            <h2 style="color: #10b981; font-size: 20px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.025em;">Payment Cleared &amp; Logged 🎉</h2>
            
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
              Hello <strong>${customerName}</strong>,<br>
              Your payment for Order <strong>${orderId}</strong> was processed with full cryptographic validation. The funds are safely secured in our smart escrow vault, and the merchant has been notified for instant warehouse packing.
            </p>

            <!-- Metadata Box -->
            <div style="background-color: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Order Summary</h3>
              <table width="100%" style="font-size: 13px; color: #475569; font-family: monospace; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Order Identifier:</td>
                  <td style="padding: 4px 0; text-align: right; font-weight: 700; color: #0f172a;">${orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;">Lodgment Date:</td>
                  <td style="padding: 4px 0; text-align: right; color: #0f172a;">${date}</td>
                </tr>
              </table>
            </div>

            <!-- Items Table -->
            ${items.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 13px; font-weight: bold; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Purchased Items</h4>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; border-collapse: collapse;">
                  ${itemsHtml}
                  <tr>
                    <td style="padding: 16px 0; font-weight: 800; color: #1e293b; font-size: 14px; text-align: left;">Total Cleared:</td>
                    <td style="padding: 16px 0; font-weight: 900; color: #10b981; font-size: 16px; text-align: right; font-family: monospace;">
                      ₦${amount.toLocaleString()}
                    </td>
                  </tr>
                </table>
              </div>
            ` : ""}

            <!-- CTA Call To Action Button -->
            <div style="text-align: center; margin-top: 32px;">
              <a href="${actionUrl}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 13px; font-weight: bold; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.1);">
                View Interactive Escrow Board
              </a>
            </div>

          </div>

          <!-- Professional Footer Notes -->
          <div style="background-color: #f8fafc; padding: 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; font-weight: bold; color: #64748b; margin: 0 0 4px 0;">NaijaStores Support &amp; Escrow Security Division</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 0 0 12px 0;">This transmission represents an official electronic sales receipt under automated ledger security.</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} NaijaStores Online. Operating across Lagos, Abuja & Enugu Hubs.</p>
          </div>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 2. Cargo Transit & Smart Tracking Dispatch Template
 * Styled with an ambient amber colorway representing movement, sorting, and delivery.
 */
export function generateShippingTrackerTemplate(data: EmailTemplateData): string {
  const { customerName, orderId, address = "Lagos, Nigeria", actionUrl = "#" } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Package is En Route - ${orderId}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
          
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
            <tr>
              <td style="background-color: #f59e0b; height: 5px; width: 33.3%;"></td>
              <td style="background-color: #ffffff; height: 5px; width: 33.3%;"></td>
              <td style="background-color: #f59e0b; height: 5px; width: 33.3%;"></td>
            </tr>
          </table>

          <div style="background-color: #0f172a; padding: 40px 32px; text-align: center;">
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #f59e0b; font-weight: 800; margin: 0 0 8px 0;">Dynamic Dispatch Network</p>
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 950; letter-spacing: -0.03em;">Logistics Operations</h1>
          </div>

          <div style="padding: 40px 32px;">
            <p style="font-size: 15px; color: #f59e0b; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Dispatch Active 🚚</p>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.025em;">Your Shipment is Live</h2>
            
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
              Exciting news <strong>${customerName}</strong>! The merchant has finalized custom packaging for Order <strong>${orderId}</strong> and safely handed off your items to our local cargo division. Courier routes are updated in real-time.
            </p>

            <!-- Delivery Stats Box -->
            <div style="background-color: #fffbeb; border-radius: 14px; border: 1px solid #fef3c7; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #78350f; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Security Pass</h3>
              <table width="100%" style="font-size: 13px; color: #78350f; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; font-weight: 600;">Recipient Hub:</td>
                  <td style="padding: 4px 0; text-align: right;">${address}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-weight: 600;">Verification Code:</td>
                  <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: bold;">SEC-LOG-${orderId.split("-")[1] || "A82F"}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
              To prevent parcel interception, do not reveal the security verification code to the courier dispatch rider until you have opened and inspected your items physically.
            </p>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${actionUrl}" style="background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 13px; font-weight: bold; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.2);">
                Track On Live Interactive Map ↗
              </a>
            </div>

          </div>

          <div style="background-color: #f8fafc; padding: 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; font-weight: bold; color: #64748b; margin: 0 0 4px 0;">NaijaStores Transit Division</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 0 0 12px 0;">Cargo transport logistics under strict digital escrow protocol.</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} NaijaStores. All rights reserved.</p>
          </div>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * 3. Security, Warning & Hold Notification Template
 * Styled with warning crimson tones to indicate priority compliance, audit, or safety holds.
 */
export function generateSecurityHoldTemplate(data: EmailTemplateData): string {
  const { customerName, orderId, alertReason = "Standard security volume threshold triggered.", actionUrl = "#" } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Audit - Order ${orderId}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);">
          
          <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
            <tr>
              <td style="background-color: #ef4444; height: 5px; width: 33.3%;"></td>
              <td style="background-color: #ffffff; height: 5px; width: 33.3%;"></td>
              <td style="background-color: #ef4444; height: 5px; width: 33.3%;"></td>
            </tr>
          </table>

          <div style="background-color: #0f172a; padding: 40px 32px; text-align: center;">
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #ef4444; font-weight: 800; margin: 0 0 8px 0;">Compliance and Safety</p>
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 950; letter-spacing: -0.03em;">Escrow Security</h1>
          </div>

          <div style="padding: 40px 32px;">
            <p style="font-size: 15px; color: #ef4444; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Action Required ⚠️</p>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.025em;">Settle Hold Audited</h2>
            
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
              Hello <strong>${customerName}</strong>,<br>
              Our centralized payment filters flagged Order <strong>${orderId}</strong> for compliance auditing because it crossed safety flags or payment standards.
            </p>

            <div style="background-color: #fef2f2; border-radius: 14px; border: 1px solid #fee2e2; padding: 20px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 13px; font-weight: 800;">Trigger Context</h3>
              <p style="margin: 0; font-size: 12px; color: #7f1d1d; line-height: 1.6;">
                ${alertReason}
              </p>
            </div>

            <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 24px;">
              <strong>Note:</strong> Your trade funds are completely secure and remain safely preserved in holding escrow. No funds will be lost or disbursed until verification clearance.
            </p>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${actionUrl}" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 13px; font-weight: bold; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);">
                Open Conflict Center
              </a>
            </div>

          </div>

          <div style="background-color: #f8fafc; padding: 32px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 11px; font-weight: bold; color: #64748b; margin: 0 0 4px 0;">Credit Integrity Compliance Division</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 0 0 12px 0;">Protected by automated double-sided transaction insurance.</p>
            <p style="font-size: 10px; color: #94a3b8; margin: 0;">© ${new Date().getFullYear()} NaijaStores Security.</p>
          </div>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
