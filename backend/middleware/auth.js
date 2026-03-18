const { getCollections } = require('../config/database');

const vendorAuth = async (req, res, next) => {
  try {
    const { vendorId } = req.body;
    
    if (!vendorId) {
      return res.status(401).json({ error: "Vendor authentication required" });
    }

    const { vendorsCollection } = getCollections();
    const vendor = await vendorsCollection.findOne({ vendorId });
    
    if (!vendor || !vendor.isActive) {
      return res.status(403).json({ error: "Invalid or inactive vendor" });
    }

    req.vendor = vendor;
    next();
  } catch (err) {
    res.status(500).json({ error: "Authentication failed" });
  }
};

module.exports = { vendorAuth };