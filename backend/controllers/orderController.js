const { getCollections } = require('../config/database');
const { ObjectId } = require("mongodb");
const { getQueuePosition, getOrderQueueDetails } = require('../services/queueService');
const Order = require('../models/Order');

const getVendorOrders = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { ordersCollection } = getCollections();
    
    const orders = await ordersCollection.find({ 
      vendorId,
      paymentStatus: "completed" 
    }).sort({ createdAt: 1 }).toArray();
    
    res.json(orders);
  } catch (err) {
    console.error("❌ Error fetching vendor orders:", err);
    res.status(500).json({ error: err.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ordersCollection } = getCollections();
    
    const orders = await ordersCollection.find({ 
      userId,
      paymentStatus: "completed" 
    }).sort({ createdAt: -1 }).toArray();
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const { ordersCollection } = getCollections();

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    let order = await ordersCollection.findOne({ orderId });
    
    if (!order) {
      try {
        order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
      } catch (e) {}
    }

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updateData = { status, updatedAt: new Date() };

    if (status === "In Progress") updateData.printStartedAt = new Date();
    else if (status === "Ready") updateData.readyAt = new Date();
    else if (status === "Picked Up") updateData.pickedUpAt = new Date();

    const result = await ordersCollection.findOneAndUpdate(
      { _id: order._id },
      { $set: updateData },
      { returnDocument: "after" }
    );

    res.json({
      success: true,
      message: `✅ Order status updated to ${status}`,
      order: result.value,
    });
  } catch (err) {
    console.error("❌ Error updating order:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getQueue = async (req, res) => {
  try {
    const { vendorId } = req.query;
    const { ordersCollection } = getCollections();
    
    let query = vendorId ? { vendorId } : {};
    const queue = await ordersCollection.find(query).sort({ createdAt: 1 }).toArray();
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getQueuePositionController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const queueDetails = await getOrderQueueDetails(orderId);
    
    if (!queueDetails) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({ success: true, ...queueDetails });
  } catch (err) {
    console.error("Queue position error:", err);
    res.status(500).json({ error: "Failed to get queue position" });
  }
};

const getUserActiveOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const { ordersCollection } = getCollections();
    
    const activeOrders = await ordersCollection.find({
      userId,
      status: { $in: ["Queued", "In Progress"] }
    }).sort({ createdAt: -1 }).toArray();
    
    const ordersWithQueue = await Promise.all(
      activeOrders.map(async (order) => {
        try {
          const queueDetails = await getOrderQueueDetails(order.orderId);
          return {
            ...order,
            queuePosition: queueDetails?.position || 0,
            totalInQueue: queueDetails?.totalInQueue || 0,
            estimatedWaitTime: queueDetails?.estimatedWaitTime || 0,
            vendorName: queueDetails?.vendorName || "Unknown"
          };
        } catch (error) {
          return order;
        }
      })
    );
    
    res.json({ success: true, orders: ordersWithQueue });
  } catch (err) {
    console.error("User active orders error:", err);
    res.status(500).json({ error: "Failed to get active orders" });
  }
};

module.exports = {
  getVendorOrders,
  getUserOrders,
  updateOrderStatus,
  getQueue,
  getQueuePositionController,
  getUserActiveOrders
};