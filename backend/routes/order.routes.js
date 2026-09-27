const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const upload = require("../config/multer");
const authMiddleware = require("../middleware/auth");
const { requireRole, requireUserOrAdmin, requireVendorOrAdmin } = require("../middleware/authorization");

router.post(
	"/upload",
	authMiddleware,
	requireRole("CUSTOMER"),
	upload.fields([
		{ name: "file", maxCount: 1 },
		{ name: "files", maxCount: 10 },
	]),
	orderController.uploadFile
);

router.get("/user/:userId", authMiddleware, requireUserOrAdmin(), orderController.getUserOrders);
router.get("/queue/:vendorId", authMiddleware, requireRole("VENDOR", "ADMIN"), requireVendorOrAdmin(), orderController.getVendorQueue);
router.get("/admin/all", authMiddleware, requireRole("ADMIN"), orderController.getAllOrders);

router.patch("/:orderId/status", authMiddleware, requireRole("VENDOR", "ADMIN"), orderController.updateStatus);
router.post("/:orderId/cancel", authMiddleware, requireRole("CUSTOMER", "ADMIN"), orderController.cancelOrder);
router.post("/verify-otp", authMiddleware, requireRole("VENDOR"), orderController.verifyOTP);

module.exports = router;
