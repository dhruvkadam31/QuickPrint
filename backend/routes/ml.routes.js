const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { requireRole } = require("../middleware/authorization");
const { predictDemand, predictWaitTime } = require("../services/mlPredictionService");

router.post("/demand", authMiddleware, requireRole("CUSTOMER", "VENDOR", "ADMIN"), async (req, res) => {
  try {
    if (!req.body.vendorId) return res.status(400).json({ success: false, error: "vendorId is required" });
    const result = await predictDemand(req.body.vendorId);
    return res.json({ success: true, ml_response: result.prediction, source: result.source });
  } catch (error) {
    return res.status(error.message === "Vendor not found" ? 404 : 500).json({ success: false, error: error.message });
  }
});

router.post("/waittime", authMiddleware, requireRole("CUSTOMER", "VENDOR", "ADMIN"), async (req, res) => {
  try {
    const { vendorId, jobPages = 1, color = "B&W", sides = "Single" } = req.body;
    if (!vendorId) return res.status(400).json({ success: false, error: "vendorId is required" });
    if (!Number.isFinite(Number(jobPages)) || Number(jobPages) < 1) {
      return res.status(400).json({ success: false, error: "jobPages must be positive" });
    }
    const result = await predictWaitTime({ vendorId, jobPages: Number(jobPages), color, sides });
    return res.json({ success: true, ml_response: result });
  } catch (error) {
    return res.status(error.message === "Vendor not found" ? 404 : 500).json({ success: false, error: error.message });
  }
});

module.exports = router;