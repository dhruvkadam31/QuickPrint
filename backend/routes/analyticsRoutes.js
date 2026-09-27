const express = require("express");
const router = express.Router();
const { getAdminAnalyticsSummary } = require("../controllers/analyticsController");
const authMiddleware = require("../middleware/auth");
const { requireRole } = require("../middleware/authorization");

router.get("/summary", authMiddleware, requireRole("ADMIN"), getAdminAnalyticsSummary);
router.get("/admin", authMiddleware, requireRole("ADMIN"), getAdminAnalyticsSummary);

module.exports = router;
