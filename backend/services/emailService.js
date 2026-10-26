const { spawn } = require("child_process");
const path = require("path");
const nodemailer = require("nodemailer");

/**
 * Dispatches action and payload to the Python SMTP engine (`backend/python_mailer/mailer.py`).
 */
function dispatchThroughPython(action, payload = {}) {
  return new Promise((resolve) => {
    const pythonScript = path.join(__dirname, "../python_mailer/mailer.py");
    const py = spawn("python", [pythonScript]);

    let stdoutData = "";
    let stderrData = "";

    py.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    py.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    py.on("close", (code) => {
      if (stderrData) {
        process.stderr.write(stderrData);
      }
      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        if (code !== 0) {
          resolve({ success: false, error: stderrData || `Python mailer exited with code ${code}` });
        } else {
          resolve({ success: true, raw: stdoutData });
        }
      }
    });

    py.on("error", (err) => {
      console.warn("⚠️ Python mailer spawn warning (falling back to Node SMTP):", err.message);
      resolve({ success: false, fallbackRequired: true, error: err.message });
    });

    py.stdin.write(JSON.stringify({ action, payload }));
    py.stdin.end();
  });
}

/**
 * Normalizes SMTP configuration from environment variables.
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
 * Node SMTP fallback sender in case Python is not installed on host
 */
async function fallbackSendEmail({ to, subject, html, text }) {
  try {
    const cfg = getSmtpConfig();
    const recipients = Array.isArray(to) ? to.join(", ") : to;

    if (!cfg.isConfigured) {
      console.log(`[SMTP Dev Preview] To: ${recipients} | Subject: ${subject}`);
      return { success: true, mocked: true };
    }

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: cfg.from,
      to: recipients,
      subject,
      html,
      text: text || subject,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Fallback SMTP error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verifies SMTP connection using Python engine
 */
async function verifySmtpConnection() {
  const pyRes = await dispatchThroughPython("verify");
  if (!pyRes.fallbackRequired) {
    if (pyRes.configured) {
      if (pyRes.success) {
        console.log(`✅ [Python SMTP Engine] Verified connection via ${pyRes.host}:${pyRes.port}`);
      } else {
        console.warn(`⚠️ [Python SMTP Engine] Connection check note: ${pyRes.message || pyRes.error}`);
      }
    } else {
      console.log(`ℹ️ [Python SMTP Engine] EMAIL_USER / EMAIL_PASSWORD not set in .env. Emails will preview in console.`);
    }
    return pyRes;
  }

  // Fallback check
  const cfg = getSmtpConfig();
  if (!cfg.isConfigured) {
    console.log("ℹ️ [SMTP Service] EMAIL_USER / EMAIL_PASSWORD not configured. Emails will preview in console.");
    return { configured: false, connected: false };
  }
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log(`✅ [SMTP Service] Node transporter verified via ${cfg.host}:${cfg.port}`);
    return { configured: true, connected: true };
  } catch (e) {
    console.warn(`⚠️ [SMTP Service] Connection warning: ${e.message}`);
    return { configured: true, connected: false, error: e.message };
  }
}

/**
 * Core email sender: Uses Python SMTP engine first, with seamless fallback
 */
async function sendEmail({ to, subject, html, text }) {
  if (!to) return { success: false, error: "No recipient provided" };

  const pyRes = await dispatchThroughPython("generic_email", { to, subject, html, text });
  if (!pyRes.fallbackRequired) {
    return pyRes;
  }

  return fallbackSendEmail({ to, subject, html, text });
}

/**
 * 1. Order Confirmation Email (Includes Pickup OTP & Shop Details)
 */
async function sendOrderConfirmationEmail(order, userEmail) {
  const pyRes = await dispatchThroughPython("order_confirmation", { order, userEmail });
  if (!pyRes.fallbackRequired) return pyRes;

  return fallbackSendEmail({
    to: userEmail || order.userEmail,
    subject: `Order Confirmation #${order.orderId} - QuickPrint`,
    html: `<p>Your QuickPrint order #${order.orderId} is confirmed. Pickup OTP: <strong>${order.otp}</strong></p>`,
    text: `Your QuickPrint order #${order.orderId} is confirmed. Pickup OTP: ${order.otp}`,
  });
}

/**
 * 2. Order Status Update Email (In Progress / Ready for Pickup)
 */
async function sendOrderStatusUpdateEmail(order, userEmail) {
  const pyRes = await dispatchThroughPython("order_status_update", { order, userEmail });
  if (!pyRes.fallbackRequired) return pyRes;

  const isReady = order.status === "Ready";
  return fallbackSendEmail({
    to: userEmail || order.userEmail,
    subject: isReady
      ? `🎉 Your Order is Ready for Pickup! #${order.orderId} - QuickPrint`
      : `🔄 Order is Printing #${order.orderId} - QuickPrint`,
    html: `<p>Order #${order.orderId} status: ${order.status}${isReady && order.otp ? `. Pickup OTP: ${order.otp}` : ""}</p>`,
    text: `Order #${order.orderId} status: ${order.status}`,
  });
}

/**
 * 3. Order Picked Up / Completion Receipt Email
 */
async function sendOrderPickedUpEmail(order, userEmail) {
  const pyRes = await dispatchThroughPython("order_picked_up", { order, userEmail });
  if (!pyRes.fallbackRequired) return pyRes;

  return fallbackSendEmail({
    to: userEmail || order.userEmail,
    subject: `Order Picked Up #${order.orderId} - QuickPrint Receipt`,
    html: `<p>Your order #${order.orderId} has been collected. Thank you!</p>`,
    text: `Your order #${order.orderId} has been collected. Thank you!`,
  });
}

/**
 * 4. Order Cancellation & Refund Email
 */
async function sendOrderCancellationEmail(order, userEmail, refundInfo = null) {
  const pyRes = await dispatchThroughPython("order_cancellation", { order, userEmail, refundInfo });
  if (!pyRes.fallbackRequired) return pyRes;

  return fallbackSendEmail({
    to: userEmail || order.userEmail,
    subject: `Order Cancelled #${order.orderId} - QuickPrint`,
    html: `<p>Your order #${order.orderId} has been cancelled.</p>`,
    text: `Your order #${order.orderId} has been cancelled.`,
  });
}

/**
 * 5. Vendor New Order Alert Notification Email
 */
async function sendVendorNewOrderAlertEmail(order, vendorEmail) {
  const pyRes = await dispatchThroughPython("vendor_new_order", { order, vendorEmail });
  if (!pyRes.fallbackRequired) return pyRes;

  return fallbackSendEmail({
    to: vendorEmail,
    subject: `🔔 New Print Order Received #${order.orderId} - QuickPrint`,
    html: `<p>New order #${order.orderId} received for your shop.</p>`,
    text: `New order #${order.orderId} received for your shop.`,
  });
}

/**
 * 6. Password Reset Email (Customer & Vendor Portals)
 */
async function sendPasswordResetEmail({ to, resetUrl, accountType = "CUSTOMER" }) {
  const pyRes = await dispatchThroughPython("password_reset", { to, resetUrl, accountType });
  if (!pyRes.fallbackRequired) return pyRes;

  const isVendor = accountType.toUpperCase() === "VENDOR";
  return fallbackSendEmail({
    to,
    subject: `🔐 Reset Your QuickPrint ${isVendor ? "Vendor " : ""}Password`,
    html: `<p>Reset your QuickPrint password by opening this link: <a href="${resetUrl}">${resetUrl}</a></p>`,
    text: `Reset your QuickPrint password: ${resetUrl}`,
  });
}

/**
 * 7. Test Email Dispatcher
 */
async function sendTestEmail(toEmail) {
  const pyRes = await dispatchThroughPython("test_email", { to: toEmail });
  if (!pyRes.fallbackRequired) return pyRes;

  return fallbackSendEmail({
    to: toEmail,
    subject: "🧪 QuickPrint SMTP Test Notification",
    html: "<p>QuickPrint SMTP Test</p>",
    text: "QuickPrint SMTP Test",
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
