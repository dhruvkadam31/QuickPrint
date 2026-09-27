const express = require("express");
const router = express.Router();
const { initiatePayment, verifyPayment } = require("../controllers/payments.controller");
const authMiddleware = require("../middleware/auth");
const { requireRole } = require("../middleware/authorization");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/initiate", authLimiter, authMiddleware, requireRole("CUSTOMER"), initiatePayment);
router.post("/verify", authLimiter, authMiddleware, requireRole("CUSTOMER"), verifyPayment);

module.exports = router;