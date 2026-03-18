const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const razorpay = require("../services/razorpayService");
const { getOrdersCollection } = require("../config/db");

const pendingOrders = new Map();

// Initiate payment
router.post("/initiate-order", async (req, res) => {
  try {
    const { 
      userId, 
      serviceType, 
      fileUrl, 
      quantity, 
      instructions, 
      estimatedPrice,
      pageCount,
      totalPages,
      color,
      sides,
      orientation 
    } = req.body;
    
    console.log("📥 Initiating order with payment:", { userId, serviceType, estimatedPrice });

    // Validate required fields
    if (!userId || !serviceType || !fileUrl || !estimatedPrice) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create temporary order data
    const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tempOrder = {
      tempOrderId,
      userId,
      serviceType,
      fileUrl,
      quantity: quantity || 1,
      instructions: instructions || "",
      estimatedPrice,
      pageCount: pageCount || 1,
      totalPages: totalPages || (pageCount * quantity) || 1,
      color: color || "B&W",
      sides: sides || "Single",
      orientation: orientation || "Portrait",
      status: "payment_pending",
      createdAt: new Date()
    };

    // Store temporary order
    pendingOrders.set(tempOrderId, tempOrder);
    setTimeout(() => {
      pendingOrders.delete(tempOrderId);
    }, 30 * 60 * 1000);

    // Create Razorpay order
    const options = {
      amount: Math.round(estimatedPrice * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        tempOrderId: tempOrderId,
        serviceType: serviceType
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);
    
    console.log("✅ Razorpay order created:", razorpayOrder.id);

    res.json({
      success: true,
      razorpayOrder: razorpayOrder,
      tempOrderId: tempOrderId,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("❌ Order initiation error:", err);
    res.status(500).json({ error: "Error initiating order" });
  }
});

// Verify payment
router.post("/verify-payment-complete-order", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tempOrderId } = req.body;

    console.log("🔍 Verifying payment for tempOrder:", tempOrderId);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !tempOrderId) {
      return res.status(400).json({ 
        success: false, 
        error: "Payment verification data missing" 
      });
    }

    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Payment signature verification failed");
      return res.status(400).json({ 
        success: false, 
        error: "Payment verification failed" 
      });
    }

    // Retrieve temporary order data
    const tempOrder = pendingOrders.get(tempOrderId);
    if (!tempOrder) {
      return res.status(404).json({ 
        success: false, 
        error: "Order data not found or expired" 
      });
    }

    // Get orders collection
    const ordersCollection = getOrdersCollection();

    // Create the actual order in database
    const newOrder = {
      orderId: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: tempOrder.userId,
      serviceType: tempOrder.serviceType,
      fileUrl: tempOrder.fileUrl,
      quantity: tempOrder.quantity,
      instructions: tempOrder.instructions,
      estimatedPrice: tempOrder.estimatedPrice,
      pageCount: tempOrder.pageCount,
      totalPages: tempOrder.totalPages,
      color: tempOrder.color,
      sides: tempOrder.sides,
      orientation: tempOrder.orientation,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: "completed",
      status: "Queued",
      createdAt: new Date(),
      paidAt: new Date()
    };

    // Save to MongoDB
    const result = await ordersCollection.insertOne(newOrder);
    
    // Clean up temporary data
    pendingOrders.delete(tempOrderId);

    console.log("✅ Order created after successful payment:", newOrder.orderId);

    res.json({ 
      success: true, 
      orderId: newOrder.orderId,
      paymentId: razorpay_payment_id,
      message: "Payment verified and order created successfully"
    });

  } catch (err) {
    console.error("❌ Payment verification error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Payment status
router.get("/payment-status/:tempOrderId", (req, res) => {
  try {
    const { tempOrderId } = req.params;
    const tempOrder = pendingOrders.get(tempOrderId);
    
    if (!tempOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ 
      exists: true, 
      status: tempOrder.status,
      createdAt: tempOrder.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;