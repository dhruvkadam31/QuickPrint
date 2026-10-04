const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    shopName: { type: String, required: true },
    phone: { type: String },

    // Availability
    isOnline: { type: Boolean, default: false },
    shopOpen: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },

    // Pricing
    bwPricePerPage: { type: Number, default: 1.5 },
    colorPricePerPage: { type: Number, default: 5.0 },
    bindingPrice: { type: Number, default: 20.0 },
    activePrinters: { type: Number, min: 1, max: 4, default: 1 },
    printerSpeedPpm: { type: Number, min: 10, max: 60, default: 30 },
    mlVendorId: { type: Number, min: 1, max: 5, default: 1 },
    isExamPeriod: { type: Boolean, default: false },
    extraServices: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vendor", vendorSchema);
