const { getCollections } = require('../config/database');

const getVendorRevenue = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { ordersCollection } = getCollections();
    
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6);

    const todayOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up",
      pickedUpAt: { $gte: startOfToday }
    }).toArray();

    const weeklyOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up", 
      pickedUpAt: { $gte: startOfWeek }
    }).toArray();

    const todayTotal = todayOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
    const todayCommission = todayTotal * 0.10;
    const todayNet = todayTotal - todayCommission;

    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = weeklyOrders.filter(order => {
        const orderDate = new Date(order.pickedUpAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });

      const dayTotal = dayOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
      const dayCommission = dayTotal * 0.10;
      const dayNet = dayTotal - dayCommission;

      weeklyData.push({
        date: dateStr,
        total: dayTotal,
        commission: dayCommission,
        net: dayNet,
        ordersCount: dayOrders.length
      });
    }

    res.json({
      success: true,
      today: {
        total: todayTotal,
        commission: todayCommission,
        net: todayNet,
        ordersCount: todayOrders.length
      },
      weekly: weeklyData
    });
  } catch (err) {
    console.error("❌ Revenue data error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch revenue data",
      details: err.message 
    });
  }
};

const getVendorRevenueStats = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { ordersCollection } = getCollections();
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const monthlyOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up",
      pickedUpAt: { $gte: startOfMonth }
    }).toArray();

    const yearlyOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up",
      pickedUpAt: { $gte: startOfYear }
    }).toArray();

    const allTimeOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up"
    }).toArray();

    const calculateStats = (orders) => {
      const total = orders.reduce((sum, order) => sum + order.estimatedPrice, 0);
      const commission = total * 0.10;
      return {
        total,
        commission,
        net: total - commission,
        ordersCount: orders.length
      };
    };

    res.json({
      success: true,
      stats: {
        monthly: calculateStats(monthlyOrders),
        yearly: calculateStats(yearlyOrders),
        allTime: calculateStats(allTimeOrders)
      }
    });
  } catch (err) {
    console.error("❌ Revenue stats error:", err);
    res.status(500).json({ error: "Failed to fetch revenue statistics" });
  }
};

module.exports = {
  getVendorRevenue,
  getVendorRevenueStats
};