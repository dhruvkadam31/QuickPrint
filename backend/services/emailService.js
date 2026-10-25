const nodemailer = require("nodemailer");

/**
 * Creates and returns a Nodemailer transporter based on environment variables.
 */
function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  // Fallback to gmail service if host is not specified
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user || "demo@quickprint.com",
      pass: pass || "demopassword",
    },
  });
}

/**
 * Generic email sender that fails gracefully and does not throw to caller
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    if (!to) {
      console.log("ℹ️ No recipient email provided. Skipping email send.");
      return false;
    }

    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "QuickPrint <no-reply@quickprint.com>";
    const transporter = createTransporter();

    const mailOptions = {
      from,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      text: text || subject,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`⚠️ Email sending failed gracefully (non-fatal): ${error.message}`);
    return false;
  }
}

/**
 * 1. Order Confirmation Email
 */
async function sendOrderConfirmationEmail(order, userEmail) {
  const to = userEmail || order.userEmail;
  const subject = `Order Confirmation #${order.orderId} - QuickPrint`;
  const fileNames = Array.isArray(order.files) && order.files.length > 0 
    ? order.files.map(f => f.originalName || f.name).join(", ") 
    : order.fileName || "Document";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
      <h2 style="color: #0F172A; text-align: center;">🖨️ QuickPrint Order Confirmed!</h2>
      <p>Hello,</p>
      <p>Thank you for your order! Your print job has been placed and sent to the queue.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
        <p style="margin: 4px 0;"><strong>Service Type:</strong> ${order.serviceType}</p>
        <p style="margin: 4px 0;"><strong>Files:</strong> ${fileNames}</p>
        <p style="margin: 4px 0;"><strong>Total Pages:</strong> ${order.totalPages || order.pageCount || 1}</p>
        <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ₹${order.estimatedPrice}</p>
        <p style="margin: 4px 0;"><strong>Print Shop:</strong> ${order.vendorName || order.vendorId || "Campus Shop"}</p>
        <p style="margin: 4px 0;"><strong>Estimated Wait Time:</strong> ~${order.predictedWaitTime || 10} mins</p>
      </div>

      <p>You can track the live progress of your order in the QuickPrint dashboard under "My Orders".</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888; text-align: center;">QuickPrint Smart Printing Platform • Academic Community Printing</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * 2. Order Status Update Email (In Progress / Ready)
 */
async function sendOrderStatusUpdateEmail(order, userEmail) {
  const to = userEmail || order.userEmail;
  const isReady = order.status === "Ready";
  const subject = isReady 
    ? `🎉 Order Ready for Pickup! #${order.orderId} - QuickPrint` 
    : `🔄 Order In Progress #${order.orderId} - QuickPrint`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
      <h2 style="color: ${isReady ? "#16a34a" : "#0284c7"}; text-align: center;">
        ${isReady ? "✅ Your Order is Ready!" : "🔄 Printing in Progress"}
      </h2>
      <p>Hello,</p>
      <p>${isReady 
        ? "Great news! Your print job is completed and ready for pickup." 
        : "Your order is currently on the printer and being processed."}</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
        <p style="margin: 4px 0;"><strong>Current Status:</strong> <span style="font-weight: bold; color: ${isReady ? "#16a34a" : "#0284c7"}">${order.status}</span></p>
        <p style="margin: 4px 0;"><strong>Print Shop:</strong> ${order.vendorName || "QuickPrint Partner Shop"}</p>
        ${isReady ? `<p style="margin: 4px 0; color: #16a34a;"><strong>Pickup Location:</strong> ${order.vendorAddress || "Print Shop Counter"}</p>` : ""}
      </div>

      <p>Please present your Order ID when picking up your documents.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888; text-align: center;">QuickPrint Platform</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * 3. Order Cancellation & Refund Email
 */
async function sendOrderCancellationEmail(order, userEmail, refundInfo = null) {
  const to = userEmail || order.userEmail;
  const subject = `Order Cancelled #${order.orderId} - QuickPrint`;
  const isRefunded = refundInfo && refundInfo.refundId;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
      <h2 style="color: #dc2626; text-align: center;">❌ Order Cancellation Notice</h2>
      <p>Hello,</p>
      <p>Your order <strong>#${order.orderId}</strong> has been successfully cancelled.</p>
      
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 4px 0;"><strong>Order ID:</strong> ${order.orderId}</p>
        <p style="margin: 4px 0;"><strong>Reason:</strong> ${order.cancellationReason || "Cancelled by user"}</p>
        <p style="margin: 4px 0;"><strong>Cancelled At:</strong> ${new Date().toLocaleString()}</p>
        ${isRefunded ? `
          <hr style="border: none; border-top: 1px dashed #fca5a5; margin: 10px 0;" />
          <p style="margin: 4px 0; color: #16a34a;"><strong>Refund Initiated:</strong> ₹${refundInfo.refundAmount || order.estimatedPrice}</p>
          <p style="margin: 4px 0; color: #16a34a;"><strong>Refund Transaction ID:</strong> ${refundInfo.refundId}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #555;">The refunded amount will reflect in your account according to Razorpay / bank timelines (3-5 business days).</p>
        ` : '<p style="margin: 4px 0;">No charge was incurred for this order.</p>'}
      </div>

      <p>If you have any questions, feel free to contact Customer Support via the QuickPrint platform.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888; text-align: center;">QuickPrint Platform</p>
    </div>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * 4. Password Reset Email
 */
async function sendPasswordResetEmail({ to, resetUrl, accountType = "CUSTOMER" }) {
  const isVendor = accountType.toUpperCase() === "VENDOR";
  const portalName = isVendor ? "Vendor Portal" : "Customer Portal";
  const primaryColor = isVendor ? "#059669" : "#4F46E5";
  const subject = `🔐 Reset Your QuickPrint ${isVendor ? "Vendor " : ""}Password`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: ${primaryColor}; margin: 0; font-size: 24px;">
          ${isVendor ? "🏪 QuickPrint Vendor Portal" : "🖨️ QuickPrint"}
        </h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Smart Printing Platform</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Password Reset Request</h3>
        <p style="color: #334155; line-height: 1.6; margin-bottom: 12px;">
          We received a request to reset the password for your QuickPrint ${portalName} account (<strong>${to}</strong>).
        </p>
        <p style="color: #334155; line-height: 1.6; margin-bottom: 20px;">
          To reset your password, click the secure button below:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset My Password
          </a>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
          Or copy and paste this link into your web browser:
        </p>
        <p style="word-break: break-all; font-size: 12px; background: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1; color: #3b82f6;">
          <a href="${resetUrl}" style="color: #2563eb; text-decoration: none;">${resetUrl}</a>
        </p>
      </div>

      <div style="border-left: 4px solid #f59e0b; background-color: #fffbeb; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
        <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>Security Notice:</strong> This password reset link is valid for <strong>15 minutes</strong> and can only be used once. If you did not request this reset, no action is required and your account remains secure.
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
        QuickPrint Platform • Academic & Campus Smart Printing
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Reset your QuickPrint password by opening this link in your browser: ${resetUrl}. This link is valid for 15 minutes. If you did not request this, please ignore this email.`,
  });
}

module.exports = {
  sendEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendOrderCancellationEmail,
  sendPasswordResetEmail,
};
