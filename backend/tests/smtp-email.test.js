const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getSmtpConfig,
  sendEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendOrderPickedUpEmail,
  sendOrderCancellationEmail,
  sendVendorNewOrderAlertEmail,
  sendPasswordResetEmail,
  verifySmtpConnection,
} = require("../services/emailService");

test("SMTP service: getSmtpConfig returns default or environment attributes", () => {
  const cfg = getSmtpConfig();
  assert.equal(typeof cfg.port, "number");
  assert.equal(typeof cfg.from, "string");
  assert.ok(cfg.from.includes("QuickPrint") || cfg.from.includes("@"));
});

test("SMTP service: verifySmtpConnection safely returns diagnostics without crashing", async () => {
  const result = await verifySmtpConnection();
  assert.equal(typeof result, "object");
  assert.ok("configured" in result);
});

test("SMTP service: sendEmail skips gracefully when recipient is missing", async () => {
  const result = await sendEmail({ to: "", subject: "Test", html: "<p>Test</p>" });
  assert.equal(result.success, false);
});

test("SMTP service: sendEmail safely previews in dev mode without throwing", async () => {
  const result = await sendEmail({
    to: "test-student@campus.edu",
    subject: "Test Subject",
    html: "<p>Hello</p>",
    text: "Hello",
  });
  assert.equal(result.success, true);
});

test("SMTP service: sendPasswordResetEmail produces formatted email for customer and vendor", async () => {
  const res1 = await sendPasswordResetEmail({
    to: "student@campus.edu",
    resetUrl: "http://localhost:5173/auth/reset-password?token=mocktoken123",
    accountType: "CUSTOMER",
  });
  assert.equal(res1.success, true);

  const res2 = await sendPasswordResetEmail({
    to: "vendor@campus.edu",
    resetUrl: "http://localhost:5173/vendor/reset-password?token=mocktoken456",
    accountType: "VENDOR",
  });
  assert.equal(res2.success, true);
});

test("SMTP service: sendOrderConfirmationEmail handles order structure and OTP", async () => {
  const dummyOrder = {
    orderId: "ORD-9999",
    serviceType: "Print",
    files: [{ originalName: "Project_Report.pdf" }],
    totalPages: 12,
    estimatedPrice: 30,
    vendorName: "Campus Express Printers",
    predictedWaitTime: 8,
    otp: "543210",
  };
  const res = await sendOrderConfirmationEmail(dummyOrder, "student@campus.edu");
  assert.equal(res.success, true);
});

test("SMTP service: sendOrderStatusUpdateEmail, sendOrderPickedUpEmail, sendOrderCancellationEmail handle status lifecycle", async () => {
  const dummyOrder = {
    orderId: "ORD-9999",
    status: "Ready",
    otp: "543210",
    vendorName: "Campus Express Printers",
    estimatedPrice: 30,
    cancellationReason: "User requested refund",
  };

  const resReady = await sendOrderStatusUpdateEmail(dummyOrder, "student@campus.edu");
  assert.equal(resReady.success, true);

  const resPickedUp = await sendOrderPickedUpEmail(dummyOrder, "student@campus.edu");
  assert.equal(resPickedUp.success, true);

  const resCancelled = await sendOrderCancellationEmail(
    dummyOrder,
    "student@campus.edu",
    { refundId: "rfnd_test123", refundAmount: 30, refundStatus: "processed" }
  );
  assert.equal(resCancelled.success, true);
});

test("SMTP service: sendVendorNewOrderAlertEmail notifies the assigned vendor", async () => {
  const dummyOrder = {
    orderId: "ORD-9999",
    userName: "Alex Student",
    serviceType: "Print",
    files: [{ originalName: "Thesis.pdf" }],
    totalPages: 50,
    estimatedPrice: 100,
    vendorEarnings: 90,
  };
  const res = await sendVendorNewOrderAlertEmail(dummyOrder, "vendor-shop@campus.edu");
  assert.equal(res.success, true);
});
