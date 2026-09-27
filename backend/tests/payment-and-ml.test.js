const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { calculatePaymentAmount, verifyRazorpaySignature } = require("../services/paymentUtils");
const { estimateQueueWaitMinutes } = require("../services/mlPredictionService");
const { requireRole, requireUserOrAdmin } = require("../middleware/authorization");

test("calculates amount from pages per sheet, copies, and vendor rate", () => {
  assert.equal(calculatePaymentAmount({ pages: 5, copies: 2, pagesPerSheet: 2, ratePerPage: 1.5 }), 900);
});

test("rejects invalid payment calculation inputs", () => {
  assert.throws(() => calculatePaymentAmount({ pages: 0, copies: 1, pagesPerSheet: 1, ratePerPage: 2 }), RangeError);
});

test("accepts a correct Razorpay signature and rejects tampering", () => {
  const secret = "test-secret";
  const signature = crypto.createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
  assert.equal(verifyRazorpaySignature("order_1", "pay_1", signature, secret), true);
  assert.equal(verifyRazorpaySignature("order_1", "pay_2", signature, secret), false);
  assert.equal(verifyRazorpaySignature("order_1", "pay_1", "not-a-signature", secret), false);
});

test("estimates wait from live backlog and configured printer capacity", () => {
  assert.equal(estimateQueueWaitMinutes({
    backlogPages: 120,
    jobPages: 15,
    activePrinters: 2,
    printerSpeedPpm: 30,
    color: "Color",
    sides: "Double",
  }), 5);
});

test("role and ownership middleware deny unrelated identities", () => {
  let passed = false;
  let statusCode;
  const res = { status(code) { statusCode = code; return this; }, json() { return this; } };
  requireRole("ADMIN")({ user: { role: "CUSTOMER" } }, res, () => { passed = true; });
  assert.equal(passed, false);
  assert.equal(statusCode, 403);

  passed = false;
  statusCode = undefined;
  requireUserOrAdmin()({ params: { userId: "other" }, user: { role: "CUSTOMER", userId: "mine" } }, res, () => { passed = true; });
  assert.equal(passed, false);
  assert.equal(statusCode, 403);
});