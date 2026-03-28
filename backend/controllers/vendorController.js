const { getCollections } = require('../config/database');
const { calculateWaitTime, getVendorQueue } = require('../services/queueService');

const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Vendor login attempt:", email);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const { vendorsCollection } = getCollections();
    const vendor = await vendorsCollection.findOne({ email });

    if (!vendor || !vendor.isActive || vendor.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await vendorsCollection.updateOne(
  { vendorId: vendor.vendorId },
  { 
    $set: { 
      lastLogin: new Date(),
      isOnline: true   // 🔥 IMPORTANT
    } 
  }
);
    res.json({
      success: true,
      message: "Login successful",
      vendor: {
        vendorId: vendor.vendorId,
        name: vendor.name,
        email: vendor.email,
        shopOpen: vendor.shopOpen,
        address: vendor.address,
        phone: vendor.phone
      }
    });
  } catch (err) {
    console.error("❌ Vendor login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

const getAllVendors = async (req, res) => {
  try {

    console.log("🔥 API HIT: /vendors"); 
    
    const { vendorsCollection } = getCollections();
    const vendors = await vendorsCollection.find({ 
      isActive: true,
      shopOpen: true ,
      isOnline: true
    }).toArray();

    vendors.forEach(v => {
    console.log("👉", v.vendorId, "isOnline:", v.isOnline);
    });

console.log("📦 Vendors from DB:", vendors);

    const vendorsWithQueue = await Promise.all(
      vendors.map(async (vendor) => {
        const queueOrders = await getVendorQueue(vendor.vendorId);
        return {
          vendorId: vendor.vendorId,
          name: vendor.name,
          email: vendor.email,
          address: vendor.address,
          phone: vendor.phone,
          services: vendor.services,
          shopOpen: vendor.shopOpen,
          currentQueue: queueOrders.length,
          estimatedWaitTime: calculateWaitTime(queueOrders.length),
          queueOrders: queueOrders.map(order => ({
            orderId: order.orderId,
            status: order.status,
            createdAt: order.createdAt
          }))
        };
      })
    );

    res.json({ success: true, vendors: vendorsWithQueue });
  } catch (err) {
    console.error("❌ Error fetching vendors:", err);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
};

const updateVendorStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { isOnline } = req.body;

    console.log("🟡 Updating vendor:", vendorId, "→ isOnline:", isOnline);

    const { vendorsCollection } = getCollections();

    await vendorsCollection.updateOne(
      { vendorId },
      { $set: { isOnline } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
};

const getVendorById = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { vendorsCollection } = getCollections();
    
    const vendor = await vendorsCollection.findOne({ vendorId });
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    const queueOrders = await getVendorQueue(vendorId);

    res.json({
      success: true,
      vendor: {
        vendorId: vendor.vendorId,
        name: vendor.name,
        email: vendor.email,
        address: vendor.address,
        phone: vendor.phone,
        services: vendor.services,
        shopOpen: vendor.shopOpen,
        currentQueue: queueOrders.length,
        estimatedWaitTime: calculateWaitTime(queueOrders.length),
        queueOrders
      }
    });
  } catch (err) {
    console.error("❌ Error fetching vendor:", err);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
};

const updateShopStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { shopOpen } = req.body;
    const { vendorsCollection } = getCollections();

    const result = await vendorsCollection.updateOne(
      { vendorId },
      { $set: { shopOpen, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json({
      success: true,
      message: `Shop is now ${shopOpen ? 'OPEN' : 'CLOSED'}`,
      shopOpen
    });
  } catch (err) {
    console.error("❌ Error updating shop status:", err);
    res.status(500).json({ error: "Failed to update shop status" });
  }
};

module.exports = {
  vendorLogin,
  getAllVendors,
  getVendorById,
  updateShopStatus,
  updateVendorStatus
};