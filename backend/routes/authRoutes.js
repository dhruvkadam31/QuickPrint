const express = require("express");
const router = express.Router();
const { adminLogin } = require("../controllers/session.controller");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/admin/login", authLimiter, adminLogin);

module.exports = router;
