const express = require("express");
const router = express.Router();
const { register, login, me, forgotPassword, verifyResetToken, resetPassword } = require("../controllers/user.controller");
const { adminLogin } = require("../controllers/session.controller");
const authMiddleware = require("../middleware/auth");
const { authLimiter, passwordResetLimiter } = require("../middleware/rateLimiter");

// User auth
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", authMiddleware, me);

// Password reset
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/verify-reset-token", authLimiter, verifyResetToken);
router.post("/reset-password", authLimiter, resetPassword);

// Admin auth
router.post("/admin/login", authLimiter, adminLogin);

module.exports = router;
