const express = require("express");
const router = express.Router();
const { getAdminAnalyticsSummary } = require("../controllers/analyticsController");

router.get("/summary", getAdminAnalyticsSummary);
router.get("/admin", getAdminAnalyticsSummary);

module.exports = router;
