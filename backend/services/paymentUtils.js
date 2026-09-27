const crypto = require("crypto");

function calculatePaymentAmount({ pages, copies, pagesPerSheet, ratePerPage }) {
  if (
    !Number.isInteger(pages) || pages < 1 ||
    !Number.isInteger(copies) || copies < 1 ||
    ![1, 2, 4].includes(pagesPerSheet) ||
    !Number.isFinite(ratePerPage) || ratePerPage <= 0
  ) {
    throw new RangeError("Invalid payment calculation input");
  }

  return Math.round(Math.ceil(pages / pagesPerSheet) * copies * ratePerPage * 100);
}

function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  if (![orderId, paymentId, signature, secret].every((value) => typeof value === "string" && value.length)) {
    return false;
  }
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const provided = Buffer.from(signature, "hex");
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

module.exports = { calculatePaymentAmount, verifyRazorpaySignature };