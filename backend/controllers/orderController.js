const { getOrdersCollection } = require("../config/db");
const { processRefund } = require("../services/refundService");
const { sendOrderStatusUpdateEmail, sendOrderCancellationEmail } = require("../services/emailService");
const { recordCompletedOrderMetrics, predictWaitTime } = require("../services/predictionService");

/**
 * Get live print queue
 */
async function getQueue(req, res) {
  try {
    const ordersCollection = getOrdersCollection();
    const queue = await ordersCollection
      .find({ status: { $nin: ["Completed", "Picked Up", "Cancelled"] } })
      .sort({ createdAt: 1 })
      .toArray();

    // Attach id alias for frontend compatibility
    const mappedQueue = queue.map((o) => ({
      ...o,
      id: o.orderId,
    }));

    res.json(mappedQueue);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get user orders
 */
async function getUserOrders(req, res) {
  try {
    const ordersCollection = getOrdersCollection();
    const userId = req.params.userId;

    const orders = await ordersCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all orders (Admin overview)
 */
async function getAllOrders(req, res) {
  try {
    const ordersCollection = getOrdersCollection();
    const orders = await ordersCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update order status
 */
async function updateOrderStatus(req, res) {
  try {
    const ordersCollection = getOrdersCollection();
    const orderId = req.params.orderId || req.body.orderId;
    const { status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: "orderId and status are required" });
    }

    const order = await ordersCollection.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const updateFields = { status };
    const now = new Date();

    if (status === "In Progress" && !order.processingStartedAt) {
      updateFields.processingStartedAt = now;
    } else if ((status === "Ready" || status === "Picked Up" || status === "Completed") && !order.readyAt) {
      updateFields.readyAt = now;
      if (order.processingStartedAt) {
        updateFields.actualProcessingTime = Math.round((now.getTime() - new Date(order.processingStartedAt).getTime()) / 1000);
      }
    }

    const result = await ordersCollection.updateOne(
      { orderId },
      { $set: updateFields }
    );

    const updatedOrder = { ...order, ...updateFields };

    // Asynchronously trigger status email & ML dataset training
    if (status === "In Progress" || status === "Ready") {
      sendOrderStatusUpdateEmail(updatedOrder).catch(() => {});
    }

    if (status === "Ready" || status === "Picked Up" || status === "Completed") {
      recordCompletedOrderMetrics(updatedOrder).catch(() => {});
    }

    return res.json({ 
      success: true, 
      status: updatedOrder.status, 
      order: updatedOrder 
    });
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Cancel Order Workflow with Razorpay Refund Integration
 */
async function cancelOrder(req, res) {
  try {
    const ordersCollection = getOrdersCollection();
    const orderId = req.params.orderId || req.body.orderId;
    const reason = req.body.reason || req.body.cancellationReason || "Cancelled by customer";
    const cancelledBy = req.user?.role || req.body.cancelledBy || "CUSTOMER";

    if (!orderId) {
      return res.status(400).json({ success: false, error: "Order ID is required" });
    }

    const order = await ordersCollection.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Check ownership if user is customer
    if (req.user?.role === "CUSTOMER" && req.user.userId && order.userId !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Unauthorized to cancel another user's order" });
    }

    // Restriction check based on existing status
    if (order.status === "Ready" || order.status === "Picked Up" || order.status === "Completed") {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order in '${order.status}' state. Cancellation is only allowed for queued or in-progress orders.`,
      });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        error: "Order is already cancelled.",
      });
    }

    // Trigger Razorpay refund if eligible
    const refundResult = await processRefund(order, reason);

    const now = new Date();
    const updateData = {
      status: "Cancelled",
      cancellationReason: reason,
      cancelledAt: now,
      cancelledBy: cancelledBy,
      refundId: refundResult.refundId || order.refundId,
      refundStatus: refundResult.refundStatus || "not_applicable",
      refundAmount: refundResult.refundAmount || 0,
      refundProcessedAt: refundResult.refundProcessedAt || null,
    };

    await ordersCollection.updateOne(
      { orderId },
      { $set: updateData }
    );

    const cancelledOrder = { ...order, ...updateData };

    // Send cancellation email
    sendOrderCancellationEmail(cancelledOrder, req.body.userEmail, refundResult).catch(() => {});

    return res.json({
      success: true,
      message: "Order cancelled successfully",
      refundInfo: refundResult,
      order: cancelledOrder,
    });
  } catch (error) {
    console.error("❌ Order cancellation error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get queue position and predicted wait time for an order
 */
async function getQueuePosition(req, res) {
  try {
    const ordersCollection = getOrdersCollection();
    const { orderId } = req.params;

    const order = await ordersCollection.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Fetch active queue orders before this order
    const precedingOrders = await ordersCollection
      .find({
        vendorId: order.vendorId,
        status: { $in: ["Queued", "In Progress"] },
        createdAt: { $lt: order.createdAt || new Date() },
      })
      .toArray();

    const position = precedingOrders.length + 1;

    // Use ML Prediction engine
    const prediction = await predictWaitTime({
      vendorId: order.vendorId,
      totalPages: order.totalPages || (order.pageCount * (order.quantity || 1)) || 1,
      color: order.color,
      sides: order.sides,
      serviceType: order.serviceType,
    });

    res.json({
      success: true,
      orderId,
      position,
      totalInQueue: position,
      estimatedWaitTime: prediction.predictedWaitTime,
      vendorName: order.vendorName || "Print Shop",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getQueue,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getQueuePosition,
};
