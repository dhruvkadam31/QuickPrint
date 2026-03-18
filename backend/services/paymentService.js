const crypto = require("crypto");
const razorpay = require('../config/razorpay');

const createRazorpayOrder = async (amount, tempOrderId, serviceType, vendorId) => {
  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
    notes: {
      tempOrderId,
      serviceType,
      vendorId
    }
  };

  return await razorpay.orders.create(options);
};

const verifyPaymentSignature = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  return expectedSignature === razorpay_signature;
};

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature
};