const Order = require("../models/Order");
const Vendor = require("../models/Vendor");
const documentProcessor = require("../services/documentProcessor");
const { processRefund } = require("../services/refundService");
const {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendOrderCancellationEmail,
} = require("../services/emailService");

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /orders/upload - upload and process file
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    console.log(`📁 Processing upload: ${req.file.originalname}`);

    // Process the document (validate, convert, count pages, etc.)
    const processingResult = await documentProcessor.processDocument(req.file);

    console.log(`✅ File processed successfully: ${processingResult.pageCount} pages`);

    res.json({
      success: true,
      ...processingResult,
    });
  } catch (err) {
    console.error("❌ File processing failed:", err);

    // Cleanup failed upload
    if (req.file?.filename) {
      await documentProcessor.cleanup(req.file.filename);
    }

    res.status(500).json({
      error: "File processing failed",
      details: err.message,
    });
  }
};

// POST /orders/create
exports.createOrder = async (req, res) => {
  try {
    const {
      userId,
      userName,
      userEmail,
      vendorId,
      fileUrl,
      originalFileName,
      serviceType,
      quantity,
      color,
      sides,
      orientation,
      instructions,
      estimatedPrice,
      paymentId,
      printConfig,
      pageCount,
      processedUrl,
      thumbnailUrl,
      metadata,
      predictedWaitTime,
    } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const totalPages = parseInt(pageCount || 1) * parseInt(quantity || 1);
    const commission = +(estimatedPrice * 0.1).toFixed(2);
    const vendorEarnings = +(estimatedPrice * 0.9).toFixed(2);
    const otp = generateOTP();
    const orderCode = Math.random().toString(36).substring(2, 6).toUpperCase();

    const order = await Order.create({
      userId,
      userName,
      userEmail,
      vendorId,
      vendorName: vendor.shopName,
      fileUrl,
      processedUrl,
      thumbnailUrl,
      originalFileName,
      serviceType,
      pageCount: parseInt(pageCount || 1),
      quantity: parseInt(quantity || 1),
      totalPages,
      color,
      sides,
      orientation,
      instructions,
      estimatedPrice: parseFloat(estimatedPrice),
      commission,
      vendorEarnings,
      paymentId,
      paymentStatus: paymentId ? "paid" : "pending",
      otp,
      status: "Queued",
      orderCode,
      metadata,
      predictedWaitTime: predictedWaitTime || 10,
      printConfig: printConfig
        ? {
            pageOption: printConfig.pageOption || "All",
            customPages: printConfig.customPages || "",
            pagesPerSheet: parseInt(printConfig.pagesPerSheet) || 1,
            copies: parseInt(printConfig.copies) || parseInt(quantity || 1),
            color: printConfig.color || color,
            sides: printConfig.sides || sides,
            orientation: printConfig.orientation || orientation,
          }
        : {
            pageOption: "All",
            customPages: "",
            pagesPerSheet: 1,
            copies: parseInt(quantity || 1),
            color,
            sides,
            orientation,
          },
    });

    // Send confirmation email asynchronously (fail-safe)
    sendOrderConfirmationEmail(order, userEmail).catch((e) =>
      console.warn("Non-fatal email error:", e.message)
    );

    // Emit to socket
    const io = req.app.get("io");
    if (io) {
      io.emit("order-created", { vendorId, order });
    }

    res.status(201).json({ success: true, order, otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/user/:userId
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /orders/:orderId/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Queued", "Printing", "Ready", "Picked Up", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const update = { status };
    if (status === "Printing") update.printStartedAt = new Date();
    if (status === "Ready") update.readyAt = new Date();
    if (status === "Picked Up") update.pickedUpAt = new Date();

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.orderId },
      update,
      { new: true }
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Send status update email if Ready
    if (status === "Ready") {
      sendOrderStatusUpdateEmail(order, order.userEmail).catch((e) =>
        console.warn("Non-fatal email error:", e.message)
      );
    }

    // Emit real-time update
    const io = req.app.get("io");
    if (io) {
      io.emit("order-updated", { orderId: order.orderId, status, order });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /orders/:orderId/cancel
exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const reason = req.body.reason || "Cancelled by customer";
    const cancelledBy = req.body.cancelledBy || "CUSTOMER";

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    if (order.status === "Ready" || order.status === "Picked Up") {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order in '${order.status}' status. It has already been processed.`,
      });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        error: "Order is already cancelled.",
      });
    }

    // Process refund via safe idempotent refund service
    const refundResult = await processRefund(order, reason);

    const updateData = {
      status: "Cancelled",
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy,
      refundId: refundResult.refundId || order.refundId,
      refundStatus: refundResult.refundStatus || "not_applicable",
      refundAmount: refundResult.refundAmount || 0,
      refundProcessedAt: refundResult.refundProcessedAt || null,
      paymentStatus: refundResult.refundId ? "refunded" : order.paymentStatus,
    };

    const updatedOrder = await Order.findOneAndUpdate(
      { orderId },
      { $set: updateData },
      { new: true }
    );

    // Send cancellation and refund email asynchronously
    sendOrderCancellationEmail(updatedOrder, req.body.userEmail || updatedOrder.userEmail, refundResult).catch(
      (e) => console.warn("Non-fatal email error:", e.message)
    );

    // Real-time socket notification
    const io = req.app.get("io");
    if (io) {
      io.emit("order-updated", {
        orderId: updatedOrder.orderId,
        status: "Cancelled",
        order: updatedOrder,
      });
    }

    res.json({
      success: true,
      message: "Order cancelled successfully",
      refundInfo: refundResult,
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /orders/verify-otp - vendor scans OTP for pickup
exports.verifyOTP = async (req, res) => {
  try {
    const { otp, vendorId } = req.body;

    const order = await Order.findOne({ otp, vendorId, otpUsed: false });
    if (!order) return res.status(404).json({ error: "Invalid OTP or already used" });

    if (order.status !== "Ready") {
      return res.status(400).json({ error: "Order is not ready for pickup" });
    }

    order.status = "Picked Up";
    order.otpUsed = true;
    order.pickedUpAt = new Date();
    await order.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("order-updated", { orderId: order.orderId, status: "Picked Up", order });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/queue/:vendorId
exports.getVendorQueue = async (req, res) => {
  try {
    const queue = await Order.find({
      vendorId: req.params.vendorId,
      status: { $in: ["Queued", "Printing"] },
    }).sort({ createdAt: 1 });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /orders/admin/all - for admin overview
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};