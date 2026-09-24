const { getAdminAnalytics } = require("../services/analyticsService");

async function getAdminAnalyticsSummary(req, res) {
  try {
    const data = await getAdminAnalytics();
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ Admin analytics error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAdminAnalyticsSummary,
};
