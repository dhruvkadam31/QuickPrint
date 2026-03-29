const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const upload = require("../config/multer");
const authMiddleware = require("../middleware/auth");

router.post("/upload", upload.single("file"), orderController.uploadFile);
router.post("/create", orderController.createOrder);

router.get("/user/:userId", orderController.getUserOrders);
router.get("/queue/:vendorId", orderController.getVendorQueue);

router.patch("/:orderId/status", authMiddleware, orderController.updateStatus);
router.post("/verify-otp", authMiddleware, orderController.verifyOTP);

module.exports = router;
