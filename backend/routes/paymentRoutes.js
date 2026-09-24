const express = require("express");
const router = express.Router();
const {
  initiateOrder,
  verifyPaymentAndCompleteOrder,
  getPaymentStatus,
} = require("../controllers/paymentController");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/initiate-order", authLimiter, initiateOrder);
router.post("/initiate", authLimiter, initiateOrder);

router.post("/verify-payment-complete-order", verifyPaymentAndCompleteOrder);
router.post("/verify", verifyPaymentAndCompleteOrder);

router.get("/payment-status/:tempOrderId", getPaymentStatus);
router.get("/status/:tempOrderId", getPaymentStatus);

module.exports = router;