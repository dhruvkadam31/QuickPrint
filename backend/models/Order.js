const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      default: () => uuidv4(),
      unique: true,
    },

    // User (Firebase UID)
    userId: { type: String, required: true },
    userName: { type: String },

    // Vendor
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    vendorName: { type: String },

    // File
    fileUrl: { type: String, required: true },
    originalFileName: { type: String },

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

    // Pricing
    estimatedPrice: { type: Number, required: true },
    commission: { type: Number },
    vendorEarnings: { type: Number },

    // Payment
    paymentId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    // OTP
    otp: { type: String },
    otpUsed: { type: Boolean, default: false },

    // Order lifecycle
    status: {
      type: String,
      enum: ["Queued", "Printing", "Ready", "Picked Up"],
      default: "Queued",
    },

    // Timestamps for each status change
    printStartedAt: { type: Date },
    readyAt: { type: Date },
    pickedUpAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
