const nodemailer = require("nodemailer");

/**
 * Normalizes and extracts SMTP configuration from environment variables.
 * Supports both SMTP_* and EMAIL_* conventions for flexibility.
 */
function getSmtpConfig() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || "587", 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
  const service = process.env.SMTP_SERVICE || process.env.EMAIL_SERVICE;
  const secureEnv = process.env.SMTP_SECURE || process.env.EMAIL_SECURE;
  const secure =
    secureEnv !== undefined
      ? secureEnv === "true" || secureEnv === true
      : port === 465;

  const defaultFrom = user
    ? `QuickPrint Notifications <${user}>`
    : "QuickPrint Notifications <no-reply@quickprint.com>";
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || defaultFrom;
  const rejectUnauthorized =
    process.env.SMTP_REJECT_UNAUTHORIZED !== "false" &&
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== "false";

  // Active if host/service + user + pass are provided
  const isConfigured = Boolean((host || service) && user && pass);

  return {
    host,
    port,
    user,
    pass,
    service,
    secure,
    from,
    rejectUnauthorized,
    isConfigured,
  };
}

let cachedTransporter = null;
let lastConfigHash = "";

/**
 * Creates and caches a Nodemailer SMTP transporter.
 */
function createTransporter() {
  const cfg = getSmtpConfig();
  const configHash = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.service}:${cfg.secure}:${cfg.rejectUnauthorized}`;

  if (cachedTransporter && lastConfigHash === configHash) {
    return cachedTransporter;
  }

  if (cfg.service) {
    cachedTransporter = nodemailer.createTransport({
      service: cfg.service,
      auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
  } else if (cfg.host) {
    cachedTransporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
      tls: {
        rejectUnauthorized: cfg.rejectUnauthorized,
      },
    });
  } else {
    // Local development fallback
    cachedTransporter = nodemailer.createTransport({
      host: "localhost",
      port: 587,
      secure: false,
      auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
  }

  lastConfigHash = configHash;
  return cachedTransporter;
}

/**
 * Verifies the SMTP connection on startup or demand
 */
async function verifySmtpConnection() {
  const cfg = getSmtpConfig();

  if (!cfg.isConfigured) {
    console.log("ℹ️ [SMTP Service] SMTP credentials (EMAIL_USER / EMAIL_PASSWORD) not configured in .env.");
    console.log("ℹ️ [SMTP Service] Emails (notifications, order receipts, password resets) will preview in the server console.");
    return { configured: false, connected: false, message: "Credentials not provided in .env" };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log(
      `✅ [SMTP Service] Connected and verified via ${cfg.host || cfg.service}:${cfg.port} (user: ${cfg.user})`
    );
    return { configured: true, connected: true, host: cfg.host || cfg.service, port: cfg.port };
  } catch (err) {
    console.warn(`⚠️ [SMTP Service] Connection warning (${cfg.host || cfg.service}:${cfg.port}): ${err.message}`);
    return { configured: true, connected: false, error: err.message };
  }
}

/**
 * Core email sender that fails gracefully and does not throw uncaught errors to caller.
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (!to) {
      console.log("ℹ️ [SMTP] No recipient email provided. Skipping email send.");
      return { success: false, error: "No recipient provided" };
    }

    const cfg = getSmtpConfig();
    const recipients = Array.isArray(to) ? to.join(", ") : to;

    // In dev mode when SMTP credentials aren't set, log email preview safely to console
    if (!cfg.isConfigured) {
      console.log("\n══════════════════════════════════════════════════════════════════");
      console.log("📨 [SMTP EMAIL DISPATCH (DEV PREVIEW / CREDENTIALS UNSET)]");
      console.log(`To:      ${recipients}`);
      console.log(`From:    ${cfg.from}`);
      console.log(`Subject: ${subject}`);
      if (text) {
        console.log(`Body (Text Preview):\n${text}`);
      }
      console.log("Tip: Add EMAIL_USER and EMAIL_PASSWORD in backend/.env for live SMTP delivery.");
      console.log("══════════════════════════════════════════════════════════════════\n");
      return { success: true, mocked: true, messageId: `mock_${Date.now()}` };
    }

    const transporter = createTransporter();
    const mailOptions = {
      from: cfg.from,
      to: recipients,
      subject,
      html,
      text: text || subject,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ [SMTP] Email sent successfully to ${recipients}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`⚠️ [SMTP] Email sending failed (non-fatal): ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 1. Order Confirmation Email (Includes Pickup OTP & Shop Details)
 */
async function sendOrderConfirmationEmail(order, userEmail) {
  const to = userEmail || order.userEmail;
  const subject = `Order Confirmation #${order.orderId} - QuickPrint`;
  const fileNames =
    Array.isArray(order.files) && order.files.length > 0
      ? order.files.map((f) => f.originalName || f.name).join(", ")
      : order.originalFileName || order.fileName || "Document";

  const totalPages = order.totalPages || order.pageCount || 1;
  const price = order.estimatedPrice ? `₹${order.estimatedPrice}` : "Paid";
  const vendorShop = order.vendorName || "Print Partner";
  const otpCode = order.otp || "Available in Dashboard";

  const html = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">🖨️ QuickPrint</h1>
        <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Smart Campus Printing Platform</p>
      </div>

      <div style="padding: 24px;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Order Confirmed!</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          Thank you for printing with QuickPrint. Your order has been placed and routed to the queue.
        </p>

        <!-- Pickup OTP Highlight Box -->
        <div style="background: #f0fdf4; border: 1.5px dashed #22c55e; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px;">Your Pickup OTP</div>
          <div style="font-size: 28px; font-weight: 800; color: #166534; letter-spacing: 4px; margin: 6px 0;">${otpCode}</div>
          <div style="font-size: 12px; color: #4b5563;">Show this 6-digit OTP at the shop counter when picking up your printouts.</div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #334155;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #64748b;">Order ID:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${order.orderId}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Service:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${order.serviceType || "Print"}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Files:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${fileNames}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Total Pages:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${totalPages}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Amount Paid:</td><td style="padding: 6px 0; font-weight: 600; text-align: right; color: #16a34a;">${price}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Print Shop:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">${vendorShop}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Est. Wait Time:</td><td style="padding: 6px 0; font-weight: 600; text-align: right;">~${order.predictedWaitTime || 10} mins</td></tr>
          </table>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          You can track the live queue progress on your QuickPrint account under <strong>My Orders</strong>.
        </p>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        QuickPrint Smart Printing Platform • Academic Community Printing
      </div>
    </div>
  `;

  const text = `QuickPrint Order Confirmed!\n\nOrder ID: ${order.orderId}\nPickup OTP: ${otpCode}\nShop: ${vendorShop}\nAmount: ${price}\nTotal Pages: ${totalPages}\nEst. Wait Time: ~${order.predictedWaitTime || 10} mins\n\nPlease keep your OTP ready for pickup.`;

  return sendEmail({ to, subject, html, text });
}

/**
 * 2. Order Status Update Email (In Progress / Ready for Pickup)
 */
async function sendOrderStatusUpdateEmail(order, userEmail) {
  const to = userEmail || order.userEmail;
  const isReady = order.status === "Ready";
  const subject = isReady
    ? `🎉 Your Order is Ready for Pickup! #${order.orderId} - QuickPrint`
    : `🔄 Order is Printing #${order.orderId} - QuickPrint`;

  const statusColor = isReady ? "#16a34a" : "#0284c7";
  const vendorShop = order.vendorName || "Print Partner";
  const otpCode = order.otp || "";

  const html = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: ${isReady ? "#16a34a" : "#0284c7"}; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">${isReady ? "✅ Ready for Pickup!" : "🔄 Printing in Progress"}</h1>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Order #${order.orderId}</p>
      </div>

      <div style="padding: 24px;">
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          ${
            isReady
              ? "Great news! Your print job is completed and waiting for you at the counter."
              : "Your document is currently being printed by the vendor."
          }
        </p>

        ${
          isReady && otpCode
            ? `
          <div style="background: #f0fdf4; border: 1.5px dashed #22c55e; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase;">Your Pickup OTP</div>
            <div style="font-size: 28px; font-weight: 800; color: #166534; letter-spacing: 4px; margin: 6px 0;">${otpCode}</div>
            <div style="font-size: 12px; color: #4b5563;">Show this code at the shop counter to collect your documents.</div>
          </div>
        `
            : ""
        }

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #334155;">
          <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> <span style="font-weight: 700; color: ${statusColor};">${order.status}</span></p>
          <p style="margin: 4px 0;"><strong>Print Shop:</strong> ${vendorShop}</p>
          ${order.vendorAddress ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${order.vendorAddress}</p>` : ""}
        </div>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        QuickPrint Smart Printing Platform
      </div>
    </div>
  `;

  const text = isReady
    ? `Your QuickPrint order #${order.orderId} is ready for pickup at ${vendorShop}!\nPickup OTP: ${otpCode}`
    : `Your QuickPrint order #${order.orderId} is now printing at ${vendorShop}.`;

  return sendEmail({ to, subject, html, text });
}

/**
 * 3. Order Picked Up / Completion Email
 */
async function sendOrderPickedUpEmail(order, userEmail) {
  const to = userEmail || order.userEmail;
  const subject = `Order Picked Up #${order.orderId} - QuickPrint Receipt`;
  const vendorShop = order.vendorName || "Print Partner";

  const html = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #059669, #047857); color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">📦 Order Collected</h1>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Thank you for using QuickPrint</p>
      </div>

      <div style="padding: 24px;">
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          Your order <strong>#${order.orderId}</strong> has been successfully verified with OTP and picked up from <strong>${vendorShop}</strong>.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #334155;">
          <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin: 4px 0;"><strong>Total Pages:</strong> ${order.totalPages || order.pageCount || 1}</p>
          <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${order.estimatedPrice}</p>
          <p style="margin: 4px 0;"><strong>Picked Up At:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p style="color: #64748b; font-size: 13px;">
          Have feedback or an issue? You can reach out through the QuickPrint support portal.
        </p>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        QuickPrint Smart Printing Platform
      </div>
    </div>
  `;

  const text = `Your QuickPrint order #${order.orderId} has been successfully collected from ${vendorShop}.\nAmount: ₹${order.estimatedPrice}\nThank you for using QuickPrint!`;

  return sendEmail({ to, subject, html, text });
}

/**
 * 4. Order Cancellation & Refund Email
 */
async function sendOrderCancellationEmail(order, userEmail, refundInfo = null) {
  const to = userEmail || order.userEmail;
  const subject = `Order Cancelled #${order.orderId} - QuickPrint`;
  const isRefunded = refundInfo && (refundInfo.refundId || refundInfo.refundStatus === "processed");
  const refundAmount = refundInfo?.refundAmount || order.estimatedPrice;

  const html = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: #dc2626; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">❌ Order Cancelled</h1>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Order #${order.orderId}</p>
      </div>

      <div style="padding: 24px;">
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          Your order has been cancelled per your request.
        </p>

        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 6px; margin: 16px 0; font-size: 14px; color: #334155;">
          <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin: 4px 0;"><strong>Reason:</strong> ${order.cancellationReason || "Cancelled by user"}</p>
          <p style="margin: 4px 0;"><strong>Cancelled At:</strong> ${new Date().toLocaleString()}</p>
          ${
            isRefunded
              ? `
            <hr style="border: none; border-top: 1px dashed #fca5a5; margin: 10px 0;" />
            <p style="margin: 4px 0; color: #16a34a; font-weight: 700;">Refund Initiated: ₹${refundAmount}</p>
            ${refundInfo.refundId ? `<p style="margin: 4px 0; font-size: 12px; color: #555;"><strong>Refund ID:</strong> ${refundInfo.refundId}</p>` : ""}
            <p style="margin: 4px 0; font-size: 12px; color: #64748b;">The refunded amount will reflect in your account according to standard banking timelines (3-5 business days).</p>
          `
              : `<p style="margin: 4px 0; font-size: 13px; color: #64748b;">No charge was captured for this order.</p>`
          }
        </div>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        QuickPrint Smart Printing Platform
      </div>
    </div>
  `;

  const text = `Your QuickPrint order #${order.orderId} has been cancelled.\nReason: ${order.cancellationReason || "Cancelled"}\n${isRefunded ? `Refund Initiated: ₹${refundAmount}` : ""}`;

  return sendEmail({ to, subject, html, text });
}

/**
 * 5. Vendor New Order Alert Notification Email
 */
async function sendVendorNewOrderAlertEmail(order, vendorEmail) {
  if (!vendorEmail) return { success: false, error: "No vendor email" };

  const subject = `🔔 New Print Order Received #${order.orderId} - QuickPrint`;
  const fileCount = Array.isArray(order.files) && order.files.length > 0 ? order.files.length : 1;
  const totalPages = order.totalPages || order.pageCount || 1;

  const html = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #065f46, #047857); color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">🏪 New Print Job Received</h1>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">QuickPrint Vendor Network</p>
      </div>

      <div style="padding: 24px;">
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          A customer has placed a new order for your shop.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 14px; color: #334155;">
          <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
          <p style="margin: 4px 0;"><strong>Customer:</strong> ${order.userName || "Student"}</p>
          <p style="margin: 4px 0;"><strong>Service:</strong> ${order.serviceType || "Print"}</p>
          <p style="margin: 4px 0;"><strong>Files:</strong> ${fileCount} file(s)</p>
          <p style="margin: 4px 0;"><strong>Total Pages:</strong> ${totalPages}</p>
          <p style="margin: 4px 0;"><strong>Your Payout:</strong> ₹${order.vendorEarnings || (order.estimatedPrice * 0.9).toFixed(2)}</p>
          ${order.instructions ? `<p style="margin: 4px 0; color: #b45309;"><strong>Instructions:</strong> ${order.instructions}</p>` : ""}
        </div>

        <p style="color: #64748b; font-size: 13px;">
          Log into your Vendor Dashboard to accept, print, and update the status of this job.
        </p>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        QuickPrint Vendor Dashboard
      </div>
    </div>
  `;

  const text = `New QuickPrint order #${order.orderId} received for your shop!\nFiles: ${fileCount}, Pages: ${totalPages}\nPlease check your Vendor Dashboard to process the print job.`;

  return sendEmail({ to: vendorEmail, subject, html, text });
}

/**
 * 6. Password Reset Email (Customer & Vendor Portals)
 */
async function sendPasswordResetEmail({ to, resetUrl, accountType = "CUSTOMER" }) {
  const isVendor = accountType.toUpperCase() === "VENDOR";
  const portalName = isVendor ? "Vendor Portal" : "Customer Portal";
  const primaryColor = isVendor ? "#059669" : "#4F46E5";
  const subject = `🔐 Reset Your QuickPrint ${isVendor ? "Vendor " : ""}Password`;

  const html = `
    <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: ${primaryColor}; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">
          ${isVendor ? "🏪 QuickPrint Vendor Portal" : "🖨️ QuickPrint"}
        </h1>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Smart Printing Platform</p>
      </div>

      <div style="padding: 28px;">
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Password Reset Request</h2>
        <p style="color: #334155; line-height: 1.6; margin-bottom: 16px; font-size: 14px;">
          We received a request to reset the password for your QuickPrint ${portalName} account (<strong>${to}</strong>).
        </p>
        <p style="color: #334155; line-height: 1.6; margin-bottom: 24px; font-size: 14px;">
          To proceed, click the secure reset button below:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 13px 32px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset My Password
          </a>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
          Or copy and paste this link into your web browser:
        </p>
        <p style="word-break: break-all; font-size: 12px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1; color: #2563eb;">
          <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
        </p>

        <div style="border-left: 4px solid #f59e0b; background-color: #fffbeb; padding: 12px 16px; border-radius: 4px; margin-top: 24px;">
          <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
            <strong>Security Notice:</strong> This link is valid for <strong>15 minutes</strong> and can only be used once. If you did not request this, no action is required and your password remains secure.
          </p>
        </div>
      </div>

      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
        QuickPrint Platform • Academic & Campus Smart Printing
      </div>
    </div>
  `;

  const text = `Reset your QuickPrint password by opening this link in your browser:\n${resetUrl}\n\nThis link is valid for 15 minutes. If you did not request this, please ignore this email.`;

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * 7. Test Email Dispatcher (for admin or setup diagnostics)
 */
async function sendTestEmail(toEmail) {
  const subject = "🧪 QuickPrint SMTP Test Notification";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #10b981;">✅ QuickPrint SMTP Email Configured Successfully!</h2>
      <p>This is a test notification confirming that your SMTP email settings are working properly.</p>
      <div style="background: #f8fafc; padding: 12px; border-radius: 6px; font-size: 13px; color: #475569;">
        <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p style="margin: 4px 0;"><strong>Recipient:</strong> ${toEmail}</p>
      </div>
      <p style="color: #64748b; font-size: 12px; margin-top: 16px;">QuickPrint Smart Printing Platform</p>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html,
    text: `QuickPrint SMTP Test: Your email configuration is operational at ${new Date().toISOString()}.`,
  });
}

module.exports = {
  getSmtpConfig,
  createTransporter,
  verifySmtpConnection,
  sendEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendOrderPickedUpEmail,
  sendOrderCancellationEmail,
  sendVendorNewOrderAlertEmail,
  sendPasswordResetEmail,
  sendTestEmail,
};
