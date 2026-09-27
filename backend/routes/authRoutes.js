const express = require("express");
const router = express.Router();
const { register, login, me } = require("../controllers/user.controller");
const { adminLogin } = require("../controllers/session.controller");
const authMiddleware = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

// User auth
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/me", authMiddleware, me);

// Admin auth
router.post("/admin/login", authLimiter, adminLogin);

module.exports = router;
