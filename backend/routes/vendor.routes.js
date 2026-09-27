const express = require("express");
const router = express.Router();
const vendorController = require("../controllers/vendor.controller");
const authMiddleware = require("../middleware/auth");
const { requireRole, requireVendorOrAdmin } = require("../middleware/authorization");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, vendorController.registerVendor);
router.post("/login", authLimiter, vendorController.loginVendor);
router.post("/logout", authMiddleware, requireRole("VENDOR"), vendorController.logoutVendor);

router.get("/available", vendorController.getAvailableVendors);

// Protected routes
router.get("/:vendorId/orders", authMiddleware, requireRole("VENDOR", "ADMIN"), requireVendorOrAdmin(), vendorController.getVendorOrders);
router.patch("/:vendorId/shop-status", authMiddleware, requireRole("VENDOR", "ADMIN"), requireVendorOrAdmin(), vendorController.toggleShopStatus);
router.patch("/:vendorId/settings", authMiddleware, requireRole("VENDOR", "ADMIN"), requireVendorOrAdmin(), vendorController.updateSettings);
router.get("/:vendorId/revenue", authMiddleware, requireRole("VENDOR", "ADMIN"), requireVendorOrAdmin(), vendorController.getRevenue);

module.exports = router;
