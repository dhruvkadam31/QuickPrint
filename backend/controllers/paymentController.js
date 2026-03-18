const { getCollections } = require('../config/database');
const { createRazorpayOrder, verifyPaymentSignature } = require('../services/paymentService');
const { getQueuePosition } = require('../services/queueService');
const Order = require('../models/Order');

const pendingOrders = new Map();

const initiateOrder = async (req, res) => {
  try {
    const { userId, serviceType, fileUrl, quantity, instructions, estimatedPrice, pageCount, totalPages, color, sides, orientation, vendorId } = req.body;
    
    if (!userId || !serviceType || !fileUrl || !estimatedPrice || !vendorId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { vendorsCollection } = getCollections();
    const vendor = await vendorsCollection.findOne({ 
      vendorId, 
      isActive: true,
      shopOpen: true 
    });
    
    if (!vendor) {
      return res.status(400).json({ error: "Selected vendor is not available" });
    }

    const commission = estimatedPrice * 0.10;
    const vendorEarnings = estimatedPrice - commission;

    const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tempOrder = {
      tempOrderId,
      userId,
      vendorId,
      vendorName: vendor.name,
      serviceType,
      fileUrl,
      quantity: quantity || 1,
      instructions: instructions || "",
      estimatedPrice,
      commission,
      vendorEarnings,
      pageCount: pageCount || 1,
      totalPages: totalPages || quantity || 1,
      color: color || "B&W",
      sides: sides || "Single",
      orientation: orientation || "Portrait",
      status: "payment_pending",
      createdAt: new Date()
    };

    pendingOrders.set(tempOrderId, tempOrder);
    setTimeout(() => pendingOrders.delete(tempOrderId), 30 * 60 * 1000);

    const razorpayOrder = await createRazorpayOrder(estimatedPrice, tempOrderId, serviceType, vendorId);

    res.json({
      success: true,
      razorpayOrder,
      tempOrderId,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error("❌ Order initiation error:", err);
    res.status(500).json({ error: "Error initiating order" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tempOrderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !tempOrderId) {
      return res.status(400).json({ success: false, error: "Payment verification data missing" });
    }

    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({ success: false, error: "Payment verification failed" });
    }

    const tempOrder = pendingOrders.get(tempOrderId);
    if (!tempOrder) {
      return res.status(404).json({ success: false, error: "Order data not found or expired" });
    }

    const queuePosition = await getQueuePosition(tempOrder.vendorId);
    const { ordersCollection } = getCollections();

    const newOrder = new Order({
      ...tempOrder,
      orderId: Date.now().toString(),
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: "completed",
      status: "Queued",
      queuePosition,
      paidAt: new Date()
    });

    await ordersCollection.insertOne(newOrder);
    pendingOrders.delete(tempOrderId);

    res.json({ 
      success: true, 
      orderId: newOrder.orderId,
      vendorId: newOrder.vendorId,
      queuePosition: newOrder.queuePosition,
      vendorName: newOrder.vendorName,
      paymentId: razorpay_payment_id,
      message: "Payment verified and order created successfully"
    });
  } catch (err) {
    console.error("❌ Payment verification error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  initiateOrder,
  verifyPayment,
  pendingOrders
};