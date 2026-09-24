const express = require("express");
const router = express.Router();
const {
  getQueue,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getQueuePosition,
} = require("../controllers/orderController");

// Get live queue
router.get("/queue", getQueue);

// Get position for specific order
router.get("/queue-position/:orderId", getQueuePosition);

// Update status alternative path
router.patch("/update-status", updateOrderStatus);

// Cancel order endpoint
router.post("/:orderId/cancel", cancelOrder);
router.post("/cancel", cancelOrder);

// User specific orders
router.get("/user/:userId", getUserOrders);
router.get("/:userId", getUserOrders);

// Patch status
router.patch("/:orderId", updateOrderStatus);

// Get all orders (admin)
router.get("/", getAllOrders);

module.exports = router;