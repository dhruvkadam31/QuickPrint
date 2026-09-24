const { getVendorsCollection, getOrdersCollection } = require("../config/db");
const { getVendorAnalytics } = require("../services/analyticsService");

/**
 * Get all available vendors
 */
async function getVendors(req, res) {
  try {
    const vendorsCollection = getVendorsCollection();
    const ordersCollection = getOrdersCollection();

    let vendors = [];
    if (vendorsCollection) {
      vendors = await vendorsCollection.find({}).toArray();
    }

    if (vendors.length === 0) {
      // Fallback default vendors
      vendors = [
        {
          vendorId: "VEN001",
          name: "Campus Print Shop",
          email: "vendor1@quickprint.com",
          phone: "+91 9876543210",
          address: "Central Library Building, Ground Floor",
          services: ["Print", "Lamination", "Photo Binding"],
          shopOpen: true,
          currentQueue: 0,
          estimatedWaitTime: 5,
        },
        {
          vendorId: "VEN002",
          name: "Express Digital Printers",
          email: "vendor2@quickprint.com",
          phone: "+91 9876543211",
          address: "Student Center, Block B",
          services: ["Print", "Lamination"],
          shopOpen: true,
          currentQueue: 0,
          estimatedWaitTime: 10,
        },
      ];
    }

    // Attach real-time queue count from orders collection
    const activeOrders = await ordersCollection
      .find({ status: { $in: ["Queued", "In Progress"] } })
      .toArray();

    const enrichedVendors = vendors.map((v) => {
      const vQueue = activeOrders.filter((o) => o.vendorId === v.vendorId).length;
      return {
        ...v,
        currentQueue: vQueue,
        estimatedWaitTime: Math.max(5, vQueue * 5),
      };
    });

    res.json({
      success: true,
      vendors: enrichedVendors,
    });
  } catch (error) {
    console.error("❌ Get vendors error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get orders for specific vendor
 */
async function getVendorOrders(req, res) {
  try {
    const ordersCollection = getOrdersCollection();
    const { vendorId } = req.params;

    const orders = await ordersCollection
      .find({ vendorId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get revenue breakdown for specific vendor
 */
async function getVendorRevenue(req, res) {
  try {
    const { vendorId } = req.params;
    const analytics = await getVendorAnalytics(vendorId);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Toggle/Update vendor shop open status
 */
async function updateShopStatus(req, res) {
  try {
    const vendorsCollection = getVendorsCollection();
    const { vendorId } = req.params;
    const { shopOpen } = req.body;

    if (typeof shopOpen !== "boolean") {
      return res.status(400).json({ success: false, error: "shopOpen must be a boolean" });
    }

    if (vendorsCollection) {
      await vendorsCollection.updateOne(
        { vendorId },
        { $set: { shopOpen } },
        { upsert: true }
      );
    }

    return res.json({
      success: true,
      shopOpen,
      message: `Shop status updated to ${shopOpen ? "OPEN" : "CLOSED"}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getVendors,
  getVendorOrders,
  getVendorRevenue,
  updateShopStatus,
};
