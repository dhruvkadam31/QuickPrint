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
    const files = [
      ...(req.files?.file || []),
      ...(req.files?.files || []),
    ];
    if (!files.length) return res.status(400).json({ error: "No file uploaded" });
    if (files.length > 10) return res.status(400).json({ error: "Maximum 10 files per order" });

    const processingResults = [];
    for (const file of files) {
      processingResults.push(await documentProcessor.processDocument(file));
    }
    const first = processingResults[0];
    const pageCount = processingResults.reduce((total, result) => total + result.pageCount, 0);

    res.json({
      success: true,
      ...first,
      pageCount,
      files: processingResults.map((result) => ({
        originalName: result.originalName,
        filename: result.filename,
        fileUrl: result.fileUrl,
        processedUrl: result.processedUrl,
        thumbnailUrl: result.thumbnailUrl,
        pageCount: result.pageCount,
        fileSize: result.fileSize,
        mimeType: result.mimeType,
        metadata: result.metadata,
      })),
    });
  } catch (err) {
    console.error("❌ File processing failed:", err);

    // Cleanup failed upload
    const files = [
      ...(req.files?.file || []),
      ...(req.files?.files || []),
    ];
    for (const file of files) {
      if (file.filename) await documentProcessor.cleanup(file.filename);
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
    if (process.env.PAYMENTS_MOCK_MODE !== "true" || process.env.NODE_ENV === "production") {
      return res.status(410).json({ error: "Use the verified payment endpoints to create orders" });
    }

    const {
      userName,
      vendorId,
      fileUrl,
      files,
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
      userId: req.user.userId,
      userName,
      userEmail: req.user.email,
      vendorId,
      vendorName: vendor.shopName,
      fileUrl,
      files: Array.isArray(files) ? files : [],
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
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (
      req.user.role === "VENDOR" &&
      String(order.vendorId) !== String(req.user.vendorId)
    ) {
      return res.status(403).json({ error: "Cannot update another vendor's order" });
    }

    const validTransition =
      (order.status === "Queued" && status === "Printing") ||
      (order.status === "Printing" && status === "Ready");
    if (!validTransition) {
      return res.status(400).json({ error: "Invalid status transition; pickup must be verified with OTP" });
    }

    const update = { status };
    if (status === "Printing") update.printStartedAt = new Date();
    if (status === "Ready") update.readyAt = new Date();

    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: req.params.orderId, status: order.status },
      { $set: update },
      { new: true }
    );

    if (!updatedOrder) return res.status(409).json({ error: "Order status changed; refresh and retry" });

    if (status === "Printing" || status === "Ready") {
      sendOrderStatusUpdateEmail(updatedOrder, updatedOrder.userEmail).catch((e) =>
        console.warn("Non-fatal email error:", e.message)
      );
    }

    // Emit real-time update
    const io = req.app.get("io");
    if (io) {
      io.emit("order-updated", { orderId: updatedOrder.orderId, status, order: updatedOrder });
    }

    res.json({ success: true, order: updatedOrder });
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

    if (req.user.role === "CUSTOMER" && order.userId !== req.user.userId) {
      return res.status(403).json({ success: false, error: "Cannot cancel another user's order" });
    }

    if (!["Queued", "Printing"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel order in '${order.status}' status.`,
      });
    }

    const refundResult = await processRefund(order, reason);
    if (!refundResult.success) {
      return res.status(502).json({
        success: false,
        error: "Order was not cancelled because its refund could not be confirmed",
        refundStatus: refundResult.refundStatus,
        details: refundResult.error,
      });
    }

    const updateData = {
      status: "Cancelled",
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: req.user.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
      refundId: refundResult.refundId || order.refundId,
      refundStatus: refundResult.refundStatus || "not_required",
      refundAmount: refundResult.refundAmount || 0,
      ...(refundResult.refundProcessedAt ? { refundProcessedAt: refundResult.refundProcessedAt } : {}),
      ...(refundResult.refundStatus === "processed" ? { paymentStatus: "refunded" } : {}),
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
    const { otp } = req.body;
    const vendorId = req.user.vendorId;

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
    }, { otp: 0, userEmail: 0 }).sort({ createdAt: 1 });
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