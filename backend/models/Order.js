const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },

    orderCode: {
      type: String,
      unique: true,
    },

    // User (Firebase UID & info)
    userId: { type: String, required: true },
    userName: { type: String },
    userEmail: { type: String },

    // Vendor
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    vendorName: { type: String },

    // File
    fileUrl: { type: String, required: true },
    originalFileName: { type: String },
    processedUrl: { type: String },
    thumbnailUrl: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },

    // Print config
    serviceType: {
      type: String,
      enum: ["Print", "Lamination", "Binding", "Photocopy"],
      default: "Print",
    },
    pageCount: { type: Number, default: 1 },
    quantity: { type: Number, default: 1 },
    totalPages: { type: Number, default: 1 },
    color: { type: String, enum: ["B&W", "Color"], default: "B&W" },
    sides: { type: String, enum: ["Single", "Double"], default: "Single" },
    orientation: { type: String, enum: ["Portrait", "Landscape"], default: "Portrait" },
    instructions: { type: String, default: "" },

    // Structured print config (for vendor display)
    printConfig: {
      pageOption: { type: String, enum: ["All", "Custom"], default: "All" },
      customPages: { type: String, default: "" },   // e.g. "1,3,5-8"
      pagesPerSheet: { type: Number, default: 1 },
      copies: { type: Number, default: 1 },
      color: { type: String, default: "B&W" },
      sides: { type: String, default: "Single" },
      orientation: { type: String, default: "Portrait" },
    },

    // Pricing
    estimatedPrice: { type: Number, required: true },
    commission: { type: Number },
    vendorEarnings: { type: Number },

    // Payment & Refund
    paymentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    refundId: { type: String },
    refundStatus: { type: String },
    refundAmount: { type: Number },
    refundProcessedAt: { type: Date },

    // OTP
    otp: { type: String },
    otpUsed: { type: Boolean, default: false },

    // Order lifecycle & Cancellation
    status: {
      type: String,
      enum: ["Queued", "Printing", "Ready", "Picked Up", "Cancelled"],
      default: "Queued",
    },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
    cancelledBy: { type: String },

    // ML Predictions & timestamps
    predictedWaitTime: { type: Number },
    printStartedAt: { type: Date },
    readyAt: { type: Date },
    pickedUpAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);