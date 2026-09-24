const Order = require("../models/Order");
const Vendor = require("../models/Vendor");

/**
 * Computes real Admin Platform Analytics using Mongoose queries
 */
async function getAdminAnalytics() {
  const now = new Date();

  // Start of Today (00:00:00)
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Start of Week (7 days ago)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  // Start of Month (30 days ago)
  const startOfMonth = new Date(now);
  startOfMonth.setDate(now.getDate() - 30);

  // 1. Fetch all orders
  const allOrders = await Order.find({}).sort({ createdAt: -1 }).lean();
  const totalOrdersCount = allOrders.length;

  let todayOrdersCount = 0;
  let weeklyOrdersCount = 0;
  let monthlyOrdersCount = 0;

  let queuedCount = 0;
  let inProgressCount = 0;
  let readyCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  let totalRevenue = 0;
  let todayRevenue = 0;
  let monthlyRevenue = 0;
  let refundedAmount = 0;

  const cancellationReasons = {};

  allOrders.forEach((o) => {
    const createdAt = new Date(o.createdAt || Date.now());
    const price = o.estimatedPrice || 0;

    // Dates
    if (createdAt >= startOfToday) todayOrdersCount++;
    if (createdAt >= startOfWeek) weeklyOrdersCount++;
    if (createdAt >= startOfMonth) monthlyOrdersCount++;

    // Status breakdown
    const status = o.status;
    if (status === "Queued") queuedCount++;
    else if (status === "Printing" || status === "In Progress") inProgressCount++;
    else if (status === "Ready") readyCount++;
    else if (status === "Picked Up" || status === "Completed") completedCount++;
    else if (status === "Cancelled") {
      cancelledCount++;
      const reason = o.cancellationReason || "Customer cancelled";
      cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
    }

    // Revenue calculation
    if (status !== "Cancelled" && o.paymentStatus !== "failed") {
      totalRevenue += price;
      if (createdAt >= startOfToday) todayRevenue += price;
      if (createdAt >= startOfMonth) monthlyRevenue += price;
    }

    if (o.paymentStatus === "refunded" || o.refundStatus === "refunded") {
      refundedAmount += (o.refundAmount || price);
    }
  });

  const netRevenue = Math.max(0, totalRevenue - refundedAmount);
  const platformCommission = +(netRevenue * 0.10).toFixed(2); // 10%
  const vendorPayouts = +(netRevenue - platformCommission).toFixed(2);

  // 2. Vendor Analytics
  const vendors = await Vendor.find({}).lean();
  const vendorStats = vendors.map((v) => {
    const vOrders = allOrders.filter((o) => String(o.vendorId) === String(v._id));
    const vRevenue = vOrders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + (o.estimatedPrice || 0), 0);

    return {
      vendorId: v._id,
      name: v.shopName || v.name,
      shopOpen: v.shopOpen,
      isOnline: v.isOnline,
      totalOrders: vOrders.length,
      totalRevenue: Math.round(vRevenue),
      vendorEarnings: +(vRevenue * 0.90).toFixed(2),
      bwPrice: v.bwPricePerPage,
      colorPrice: v.colorPricePerPage,
    };
  });

  // 3. Time Series Data for Charts (Last 7 Days)
  const dailyTrends = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextD = new Date(d);
    nextD.setDate(d.getDate() + 1);

    const dayOrders = allOrders.filter((o) => {
      const cAt = new Date(o.createdAt || Date.now());
      return cAt >= d && cAt < nextD;
    });

    const dayRev = dayOrders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + (o.estimatedPrice || 0), 0);

    dailyTrends.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      orders: dayOrders.length,
      revenue: Math.round(dayRev),
      completed: dayOrders.filter((o) => o.status === "Picked Up" || o.status === "Completed").length,
      cancelled: dayOrders.filter((o) => o.status === "Cancelled").length,
    });
  }

  const cancellationRate = totalOrdersCount > 0 
    ? Math.round((cancelledCount / totalOrdersCount) * 100 * 10) / 10 
    : 0;

  return {
    orderStats: {
      total: totalOrdersCount,
      today: todayOrdersCount,
      weekly: weeklyOrdersCount,
      monthly: monthlyOrdersCount,
      queued: queuedCount,
      inProgress: inProgressCount,
      ready: readyCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
    revenueStats: {
      totalRevenue: Math.round(totalRevenue),
      todayRevenue: Math.round(todayRevenue),
      monthlyRevenue: Math.round(monthlyRevenue),
      refundedAmount: Math.round(refundedAmount),
      netRevenue: Math.round(netRevenue),
      platformCommission: Math.round(platformCommission),
      vendorPayouts: Math.round(vendorPayouts),
    },
    vendorStats: {
      totalVendors: vendors.length,
      activeVendors: vendors.filter((v) => v.shopOpen !== false).length,
      vendors: vendorStats,
    },
    cancellationStats: {
      totalCancelled: cancelledCount,
      cancellationRate: `${cancellationRate}%`,
      reasons: cancellationReasons,
    },
    dailyTrends,
  };
}

module.exports = {
  getAdminAnalytics,
};
