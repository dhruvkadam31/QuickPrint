const express = require("express");
const router = express.Router();
const axios = require("axios");

/*
STEP 1:
Basic test route for Model 1 (Demand Prediction)
This sends sample data to FastAPI and returns result
*/

router.post("/demand", async (req, res) => {
  try {
    const payload = {
  vendor_id: 1,
  month: 4,
  day_of_week: 0,
  hour_of_day: 10,
  is_exam_period: 1,
  is_weekday: 1,
  active_printers: 3,
  orders_prev_1h: 15,
  orders_prev_3h: 38
};

    const response = await axios.post(
      "http://127.0.0.1:8000/predict",
      payload
    );

    res.json({
      success: true,
      ml_response: response.data
    });

  } catch (error) {
    console.error("ML Demand Prediction Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch ML demand prediction",
      error: error.message
    });
  }
});

module.exports = router;