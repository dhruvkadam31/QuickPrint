const Order = require("../models/Order");
const Vendor = require("../models/Vendor");
const PaymentAttempt = require("../models/PaymentAttempt");
const razorpay = require("../services/razorpayService");
const { sendOrderConfirmationEmail } = require("../services/emailService");
const { predictWaitTime } = require("../services/mlPredictionService");
const { calculatePaymentAmount, verifyRazorpaySignature } = require("../services/paymentUtils");

function isRazorpayConfigured() {
  const key = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  return key.startsWith("rzp_") && secret.length > 0 &&
    !/placeholder|demo/i.test(`${key} ${secret}`);
}

function validUploadUrl(value) {
  if (typeof value !== "string") return false;
  if (/^\/uploads\/[\w.%-]+$/.test(value)) return true;
  try {
    const fileUrl = new URL(value);
    const apiUrl = new URL(process.env.PUBLIC_API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`);
    return fileUrl.origin === apiUrl.origin && /^\/uploads\/[\w.%-]+$/.test(fileUrl.pathname);
  } catch {
    return false;
  }
}

async function initiatePayment(req, res) {
  try {
    const {
      vendorId, fileUrl, files = [], originalFileName, serviceType = "Print", pageCount = 1,
      quantity = 1, pagesPerSheet = 1, color = "B&W", sides = "Single",
      orientation = "Portrait", instructions = "", printConfig = {},
      processedUrl, thumbnailUrl, metadata,
    } = req.body;

    if (!["Print", "Lamination", "Binding", "Photocopy"].includes(serviceType)) {
      return res.status(400).json({ success: false, error: "Invalid service type" });
    }
    if (!Array.isArray(files) || files.length > 10 || files.some((file) => !validUploadUrl(file.fileUrl))) {
      return res.status(400).json({ success: false, error: "Invalid uploaded file list" });
    }
    if (!validUploadUrl(fileUrl)) {
      return res.status(400).json({ success: false, error: "A valid uploaded file URL is required" });
    }

    const pages = Number(pageCount);
    const copies = Number(quantity);
    const sheetCount = Number(pagesPerSheet);
    if (!Number.isInteger(pages) || pages < 1 || pages > 10000 ||
        !Number.isInteger(copies) || copies < 1 || copies > 100 ||
        ![1, 2, 4].includes(sheetCount)) {
      return res.status(400).json({ success: false, error: "Invalid page, copy, or pages-per-sheet count" });
    }
    if (!["B&W", "Color"].includes(color) || !["Single", "Double"].includes(sides) ||
        !["Portrait", "Landscape"].includes(orientation)) {
      return res.status(400).json({ success: false, error: "Invalid print configuration" });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.isOnline || !vendor.shopOpen) {
      return res.status(400).json({ success: false, error: "Vendor is unavailable" });
    }

    const rate = color === "Color" ? vendor.colorPricePerPage : vendor.bwPricePerPage;
    const amount = calculatePaymentAmount({ pages, copies, pagesPerSheet: sheetCount, ratePerPage: rate });
    if (!Number.isSafeInteger(amount) || amount < 100) {
      return res.status(400).json({ success: false, error: "Calculated payment amount is invalid" });
    }

    const mockEnabled = process.env.PAYMENTS_MOCK_MODE === "true" && process.env.NODE_ENV !== "production";
    const paymentMode = mockEnabled ? "mock" : "razorpay";
    if (paymentMode === "razorpay" && !isRazorpayConfigured()) {
      return res.status(503).json({ success: false, error: "Razorpay is not configured" });
    }

    const waitPrediction = await predictWaitTime({
      vendorId: vendor._id,
      jobPages: pages * copies,
      color,
      sides,
    });

    const orderData = {
      vendorId: vendor._id,
      vendorName: vendor.shopName,
      fileUrl,
      files: Array.isArray(files) ? files : [],
      originalFileName: originalFileName || "Document",
      serviceType,
      pageCount: pages,
      quantity: copies,
      totalPages: pages * copies,
      color,
      sides,
      orientation,
      instructions: String(instructions).slice(0, 1000),
      estimatedPrice: amount / 100,
      predictedWaitTime: waitPrediction.estimated_wait_minutes,
      commission: Number((amount / 100 * 0.1).toFixed(2)),
      vendorEarnings: Number((amount / 100 * 0.9).toFixed(2)),
      processedUrl,
      thumbnailUrl,
      metadata,
      printConfig: {
        pageOption: printConfig.pageOption === "Custom" ? "Custom" : "All",
        customPages: String(printConfig.customPages || "").slice(0, 200),
        pagesPerSheet: sheetCount,
        copies,
        color,
        sides,
        orientation,
      },
    };

    const attempt = await PaymentAttempt.create({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.name || req.user.email,
      orderData,
      paymentMode,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    if (paymentMode === "mock") {
      return res.json({
        success: true,
        mock: true,
        paymentAttemptId: attempt.id,
        amount,
        currency: "INR",
      });
    }

    try {
      const razorpayOrder = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `qp_${attempt.id}`,
        notes: { paymentAttemptId: attempt.id, userId: req.user.userId },
      });
      attempt.razorpayOrderId = razorpayOrder.id;
      await attempt.save();

      return res.json({
        success: true,
        mock: false,
        paymentAttemptId: attempt.id,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      attempt.status = "failed";
      await attempt.save();
      console.error("Razorpay order creation failed:", error.message);
      return res.status(502).json({ success: false, error: "Unable to initiate Razorpay payment" });
    }
  } catch (error) {
    console.error("Payment initiation failed:", error.message);
    return res.status(500).json({ success: false, error: "Unable to initiate payment" });
  }
}

async function createOrderFromAttempt(attempt, paymentId) {
  const existing = await Order.findOne({ paymentId });
  if (existing) return existing;

  const orderData = attempt.orderData;
  const order = await Order.create({
    ...orderData,
    userId: attempt.userId,
    userEmail: attempt.userEmail,
    userName: attempt.userName,
    paymentId,
    paymentStatus: "paid",
    status: "Queued",
    orderCode: crypto.randomBytes(3).toString("hex").toUpperCase(),
    otp: String(crypto.randomInt(100000, 1000000)),
  });

  sendOrderConfirmationEmail(order, attempt.userEmail).catch((error) =>
    console.warn("Order email failed:", error.message)
  );
  return order;
}

async function verifyPayment(req, res) {
  const {
    paymentAttemptId, razorpayOrderId, razorpayPaymentId,
    razorpaySignature, mockPayment,
  } = req.body;

  try {
    const attempt = await PaymentAttempt.findOne({
      _id: paymentAttemptId,
      userId: req.user.userId,
      expiresAt: { $gt: new Date() },
    });
    if (!attempt) {
      return res.status(404).json({ success: false, error: "Payment attempt not found or expired" });
    }

    if (attempt.status === "completed") {
      const order = await Order.findOne({ orderId: attempt.orderId });
      return res.json({ success: true, order, idempotent: true });
    }
    if (attempt.status !== "initiated") {
      return res.status(409).json({ success: false, error: "Payment attempt is not payable" });
    }

    let paymentId;
    if (attempt.paymentMode === "mock") {
      if (process.env.PAYMENTS_MOCK_MODE !== "true" || process.env.NODE_ENV === "production" || mockPayment !== true) {
        return res.status(400).json({ success: false, error: "Mock payment is disabled" });
      }
      paymentId = `sim_pay_${attempt.id}`;
    } else {
      if (razorpayOrderId !== attempt.razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ success: false, error: "Payment verification fields do not match" });
      }

      if (!verifyRazorpaySignature(
        attempt.razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        process.env.RAZORPAY_KEY_SECRET
      )) {
        return res.status(400).json({ success: false, error: "Invalid payment signature" });
      }

      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      if (
        payment.order_id !== attempt.razorpayOrderId ||
        payment.amount !== Math.round(attempt.orderData.estimatedPrice * 100) ||
        payment.currency !== "INR" ||
        payment.status !== "captured"
      ) {
        return res.status(400).json({ success: false, error: "Payment is not captured for this order" });
      }
      paymentId = razorpayPaymentId;
    }

    const claim = await PaymentAttempt.findOneAndUpdate(
      { _id: attempt._id, status: "initiated" },
      { $set: { status: "processing", paymentId } },
      { new: true }
    );
    if (!claim) {
      const duplicate = await PaymentAttempt.findById(attempt._id);
      if (duplicate?.status === "completed") {
        const order = await Order.findOne({ orderId: duplicate.orderId });
        return res.json({ success: true, order, idempotent: true });
      }
      return res.status(409).json({ success: false, error: "Payment verification is already in progress" });
    }

    const order = await createOrderFromAttempt(claim, paymentId);
    claim.status = "completed";
    claim.orderId = order.orderId;
    await claim.save();

    const io = req.app.get("io");
    io?.emit("order-created", { vendorId: order.vendorId, order });
    return res.status(201).json({ success: true, order, otp: order.otp });
  } catch (error) {
    console.error("Payment verification failed:", error.message);
    if (paymentAttemptId) {
      await PaymentAttempt.updateOne(
        { _id: paymentAttemptId, userId: req.user.userId, status: "processing" },
        { $set: { status: "failed" } }
      ).catch(() => {});
    }
    return res.status(500).json({ success: false, error: "Unable to verify payment" });
  }
}

module.exports = { initiatePayment, verifyPayment };