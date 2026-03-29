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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vendor", vendorSchema);
