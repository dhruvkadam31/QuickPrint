const razorpay = require("./razorpayService");
const Order = require("../models/Order");

/**
 * Safe and idempotent refund service for Razorpay integration.
 * Handles paid orders, prevents duplicate refunds, and updates order refund state.
 * 
 * @param {Object} order - Order document to refund
 * @param {string} [reason="Customer cancellation"] - Reason for refund
 * @returns {Promise<Object>} Refund process result
 */
async function processRefund(order, reason = "Customer cancellation") {
  if (order.refundStatus === "processed" || order.paymentStatus === "refunded") {
    console.log(`⚠️ Order ${order.orderId} is already refunded.`);
    return {
      success: true,
      alreadyRefunded: true,
      refundId: order.refundId,
      refundAmount: order.refundAmount,
      refundStatus: "processed",
    };
  }

  const paymentId = order.paymentId;
  if (order.paymentStatus !== "paid" || !paymentId) {
    return {
      success: true,
      refundRequired: false,
      refundStatus: "not_required",
      message: "Order was unpaid. No refund required.",
    };
  }

  if (paymentId.startsWith("sim_pay_")) {
    return {
      success: true,
      refundRequired: false,
      refundStatus: "not_applicable",
      message: "Development payment was simulated; no money was charged.",
    };
  }

  if (
    !razorpay ||
    !process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_KEY_SECRET === "placeholder_secret"
  ) {
    return {
      success: false,
      refundRequired: true,
      refundStatus: "failed",
      error: "Razorpay refunds are not configured",
    };
  }

  const refundAmount = order.estimatedPrice || 0;
  if (refundAmount <= 0) {
    return {
      success: false,
      refundRequired: true,
      refundStatus: "failed",
      error: "Refund amount must be greater than zero",
    };
  }

  const amountInPaise = Math.round(refundAmount * 100);
  const claim = await Order.findOneAndUpdate(
    {
      _id: order._id,
      refundStatus: { $nin: ["processing", "pending", "processed"] },
    },
    { $set: { refundStatus: "processing" } },
    { new: true }
  );

  if (!claim) {
    return {
      success: false,
      refundRequired: true,
      refundStatus: order.refundStatus || "processing",
      error: "A refund for this order is already processing",
    };
  }

  try {
    const refundResponse = await razorpay.payments.refund(paymentId, {
      amount: amountInPaise,
      speed: "optimum",
      notes: { orderId: order.orderId, reason },
    });

    const refundStatus = refundResponse.status;
    if (!refundResponse.id || !["pending", "processed"].includes(refundStatus)) {
      throw new Error(`Razorpay returned an unsuccessful refund status: ${refundStatus || "unknown"}`);
    }

    const refundProcessedAt = refundStatus === "processed" ? new Date() : null;
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        refundStatus,
        refundId: refundResponse.id,
        refundAmount,
        refundProcessedAt,
        ...(refundStatus === "processed" ? { paymentStatus: "refunded" } : {}),
      },
    });

    return {
      success: true,
      refundId: refundResponse.id,
      refundStatus,
      refundAmount,
      refundProcessedAt,
    };
  } catch (error) {
    await Order.findByIdAndUpdate(order._id, {
      $set: { refundStatus: "failed" },
    });
    return {
      success: false,
      refundRequired: true,
      refundStatus: "failed",
      error: error.message,
    };
  }
}

module.exports = {
  processRefund,
};
