const express = require("express");
const router = express.Router();
const { handleVendorLogin, handleAdminLogin } = require("../controllers/authController");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/vendor/login", authLimiter, handleVendorLogin);
router.post("/admin/login", authLimiter, handleAdminLogin);

module.exports = router;
