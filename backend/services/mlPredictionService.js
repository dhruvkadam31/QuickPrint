const axios = require("axios");
const Order = require("../models/Order");
const Vendor = require("../models/Vendor");

const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));

function estimateQueueWaitMinutes({ backlogPages, jobPages, activePrinters, printerSpeedPpm, color, sides }) {
  const capacity = Math.max(1, Number(activePrinters) * Number(printerSpeedPpm));
  const modifiers = (color === "Color" ? 1.5 : 1) * (sides === "Double" ? 1.3 : 1);
  return Math.max(1, Math.ceil(((Number(backlogPages) + Number(jobPages)) / capacity) * modifiers));
}

async function getVendorSnapshot(vendorId) {
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw new Error("Vendor not found");

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const baseQuery = { vendorId: vendor._id, status: { $ne: "Cancelled" } };
  const [queue, ordersPrev1h, ordersPrev3h] = await Promise.all([
    Order.find({ vendorId: vendor._id, status: { $in: ["Queued", "Printing"] } })
      .select("totalPages pageCount quantity")
      .lean(),
    Order.countDocuments({ ...baseQuery, createdAt: { $gte: hourAgo } }),
    Order.countDocuments({ ...baseQuery, createdAt: { $gte: threeHoursAgo } }),
  ]);

  const backlogPages = queue.reduce(
    (total, order) => total + (order.totalPages || order.pageCount * order.quantity || order.pageCount || 1),
    0
  );

  return {
    vendor,
    queueLength: queue.length,
    backlogPages,
    ordersPrev1h,
    ordersPrev3h,
    activePrinters: clamp(vendor.activePrinters || 1, 1, 4),
    printerSpeedPpm: clamp(vendor.printerSpeedPpm || 30, 10, 60),
  };
}

async function predictDemand(vendorId) {
  const snapshot = await getVendorSnapshot(vendorId);
  const now = new Date();
  const hour = clamp(now.getHours(), 8, 20);
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  const payload = {
    vendor_id: clamp(snapshot.vendor.mlVendorId || 1, 1, 5),
    month: now.getMonth() + 1,
    day_of_week: (now.getDay() + 6) % 7,
    hour_of_day: hour,
    is_exam_period: snapshot.vendor.isExamPeriod ? 1 : 0,
    is_weekday: weekday ? 1 : 0,
    active_printers: snapshot.activePrinters,
    orders_prev_1h: snapshot.ordersPrev1h,
    orders_prev_3h: snapshot.ordersPrev3h,
  };

  try {
    const response = await axios.post(
      process.env.ML_DEMAND_URL || "http://127.0.0.1:8000/predict",
      payload,
      { timeout: 3000 }
    );
    return { ...snapshot, prediction: response.data, source: "model" };
  } catch (error) {
    const predictedOrders = Math.max(0, Math.round(snapshot.ordersPrev1h));
    return {
      ...snapshot,
      prediction: {
        predicted_orders: predictedOrders,
        demand_class: predictedOrders <= 5 ? "Low" : predictedOrders <= 12 ? "Medium" : "High",
        recommendation: "Estimated from recent order volume; demand model is unavailable.",
        peak_level: Math.min(predictedOrders / 40, 1),
      },
      source: "recent-orders-fallback",
    };
  }
}

async function predictWaitTime({ vendorId, jobPages = 1, color = "B&W", sides = "Single" }) {
  const snapshot = await getVendorSnapshot(vendorId);
  const demand = await predictDemand(vendorId);
  const payload = {
    queue_length: clamp(snapshot.queueLength, 0, 50),
    backlog_pages: clamp(snapshot.backlogPages, 0, 2000),
    active_printers: snapshot.activePrinters,
    printer_speed_ppm: snapshot.printerSpeedPpm,
    job_pages: clamp(jobPages, 1, 500),
    is_color: color === "Color" ? 1 : 0,
    is_duplex: sides === "Double" ? 1 : 0,
    predicted_demand: clamp((demand.prediction.peak_level || 0) * 39, 5, 39),
  };

  const BUFFER_MINUTES = 10;

  try {
    const response = await axios.post(
      process.env.ML_WAITTIME_URL || "http://127.0.0.1:8001/predict",
      payload,
      { timeout: 3000 }
    );
    const rawEstimated = estimateQueueWaitMinutes({
      backlogPages: snapshot.backlogPages,
      jobPages: Number(jobPages || 1),
      activePrinters: snapshot.activePrinters,
      printerSpeedPpm: snapshot.printerSpeedPpm,
      color,
      sides,
    });
    
    // If ML underpredicts significantly compared to raw math (queue size), trust the math more
    const mlWait = response.data.estimated_wait_minutes || 0;
    const effectiveWait = Math.max(mlWait, rawEstimated);
    
    const finalWait = Number((effectiveWait + BUFFER_MINUTES).toFixed(1));
    return { 
      ...response.data, 
      estimated_wait_minutes: finalWait,
      message_to_student: `Your order will be ready in about ${finalWait} minutes (includes 10m buffer).`,
      source: mlWait < rawEstimated ? "model-adjusted" : "model", 
      queue_length: payload.queue_length 
    };
  } catch (error) {
    const rawEstimated = estimateQueueWaitMinutes({
      backlogPages: snapshot.backlogPages,
      jobPages: Number(jobPages || 1),
      activePrinters: snapshot.activePrinters,
      printerSpeedPpm: snapshot.printerSpeedPpm,
      color,
      sides,
    });
    const finalWait = Number((rawEstimated + BUFFER_MINUTES).toFixed(1));
    return {
      estimated_wait_minutes: finalWait,
      message_to_student: `Estimated wait is about ${finalWait} minutes (includes 10m buffer).`,
      urgency: finalWait > 20 ? "High" : finalWait > 10 ? "Medium" : "Low",
      advice: "Prediction model unavailable; using a queue-based estimate.",
      source: "queue-fallback",
      queue_length: payload.queue_length,
    };
  }
}

module.exports = { predictDemand, predictWaitTime, estimateQueueWaitMinutes };