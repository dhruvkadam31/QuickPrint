const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendor.controller");
const authMiddleware = require("../middleware/auth");

router.post("/register", vendorController.registerVendor);
router.post("/login", vendorController.loginVendor);
router.post("/logout", vendorController.logoutVendor);

router.get("/available", vendorController.getAvailableVendors);

// Protected routes
router.get("/:vendorId/orders", authMiddleware, vendorController.getVendorOrders);
router.patch("/:vendorId/shop-status", authMiddleware, vendorController.toggleShopStatus);
router.patch("/:vendorId/settings", authMiddleware, vendorController.updateSettings);
router.get("/:vendorId/revenue", authMiddleware, vendorController.getRevenue);

module.exports = router;
