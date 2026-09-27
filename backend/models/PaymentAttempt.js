const mongoose = require("mongoose");

const paymentAttemptSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String },
    userName: { type: String },
    orderData: { type: mongoose.Schema.Types.Mixed, required: true },
    paymentMode: { type: String, enum: ["razorpay", "mock"], required: true },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    paymentId: { type: String },
    status: {
      type: String,
      enum: ["initiated", "processing", "completed", "failed"],
      default: "initiated",
    },
    orderId: { type: String },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentAttempt", paymentAttemptSchema);