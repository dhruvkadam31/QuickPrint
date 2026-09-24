const express = require("express");
const router = express.Router();
const {
  getVendors,
  getVendorOrders,
  getVendorRevenue,
  updateShopStatus,
} = require("../controllers/vendorController");

// Get all print shops / vendors
router.get("/", getVendors);

// Vendor specific orders
router.get("/:vendorId/orders", getVendorOrders);

// Vendor revenue stats
router.get("/:vendorId/revenue", getVendorRevenue);

// Update shop status
router.patch("/:vendorId/shop-status", updateShopStatus);

module.exports = router;
