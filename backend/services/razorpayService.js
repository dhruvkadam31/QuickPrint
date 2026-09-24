const Razorpay = require("razorpay");

let razorpay = null;

try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } else {
    // Provide a dummy mock instance if keys are not configured yet to prevent crashing
    razorpay = new Razorpay({
      key_id: "rzp_test_placeholder",
      key_secret: "placeholder_secret",
    });
  }
} catch (err) {
  console.warn("⚠️ Razorpay client initialization warning:", err.message);
}

module.exports = razorpay;