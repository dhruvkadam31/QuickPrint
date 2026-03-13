const express = require("express");
const router = express.Router();
const { getOrdersCollection } = require("../config/db");

// Get queue (all non-completed orders)
router.get("/queue", async (req, res) => {
  try {
    const ordersCollection = getOrdersCollection();
    const queue = await ordersCollection
      .find({ status: { $ne: "Completed" } })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user orders
router.get("/:userId", async (req, res) => {
  try {
    const ordersCollection = getOrdersCollection();
    const orders = await ordersCollection
      .find({ 
        userId: req.params.userId, 
        paymentStatus: "completed" 
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
router.patch("/:orderId", async (req, res) => {
  try {
    const ordersCollection = getOrdersCollection();

    const result = await ordersCollection.updateOne(
      { orderId: req.params.orderId },
      { $set: { status: req.body.status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true, status: req.body.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (admin)
router.get("/", async (req, res) => {
  try {
    const ordersCollection = getOrdersCollection();
    const orders = await ordersCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;