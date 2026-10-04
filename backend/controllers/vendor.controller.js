const Vendor = require("../models/Vendor");
const Order = require("../models/Order");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// POST /vendor/register
exports.registerVendor = async (req, res) => {
  try {
    const { name, email, password, shopName, phone } = req.body;

    const existing = await Vendor.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const vendor = await Vendor.create({ name, email, password: hashed, shopName, phone });

    res.status(201).json({ message: "Vendor registered", vendorId: vendor._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /vendor/login
exports.loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const match = await bcrypt.compare(password, vendor.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { vendorId: vendor._id, email: vendor.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Mark vendor as online
    await Vendor.findByIdAndUpdate(vendor._id, { isOnline: true });

    res.json({
      token,
      vendor: {
        vendorId: vendor._id,
        name: vendor.name,
        email: vendor.email,
        shopName: vendor.shopName,
        shopOpen: vendor.shopOpen,
        isOnline: true,
        bwPricePerPage: vendor.bwPricePerPage,
        colorPricePerPage: vendor.colorPricePerPage,
        bindingPrice: vendor.bindingPrice,
        extraServices: vendor.extraServices || [],
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /vendor/available - for user to see available vendors
exports.getAvailableVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find(
      { isOnline: true, shopOpen: true, isActive: true },
      { password: 0 }
    );
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /vendor/:vendorId/orders
exports.getVendorOrders = async (req, res) => {
  try {
    const orders = await Order.find({ vendorId: req.params.vendorId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /vendor/:vendorId/shop-status
exports.toggleShopStatus = async (req, res) => {
  try {
    const { shopOpen } = req.body;
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      { shopOpen },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });

    const io = req.app.get("io");
    io.emit("vendor-status-change", { vendorId: vendor._id, shopOpen });

    res.json({ success: true, shopOpen: vendor.shopOpen });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /vendor/:vendorId/settings
exports.updateSettings = async (req, res) => {
  try {
    const {
      bwPricePerPage, colorPricePerPage, bindingPrice, shopOpen,
      activePrinters, printerSpeedPpm, mlVendorId, isExamPeriod,
    } = req.body;
    const settings = {};
    for (const [field, value] of Object.entries({ bwPricePerPage, colorPricePerPage, bindingPrice })) {
      if (value !== undefined) {
        const amount = Number(value);
        if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
          return res.status(400).json({ error: `Invalid ${field}` });
        }
        settings[field] = amount;
      }
    }
    for (const [field, value, min, max] of [
      ["activePrinters", activePrinters, 1, 4],
      ["printerSpeedPpm", printerSpeedPpm, 10, 60],
      ["mlVendorId", mlVendorId, 1, 5],
    ]) {
      if (value !== undefined) {
        const number = Number(value);
        if (!Number.isInteger(number) || number < min || number > max) {
          return res.status(400).json({ error: `Invalid ${field}` });
        }
        settings[field] = number;
      }
    }
    if (shopOpen !== undefined) {
      if (typeof shopOpen !== "boolean") return res.status(400).json({ error: "shopOpen must be boolean" });
      settings.shopOpen = shopOpen;
    }
    if (isExamPeriod !== undefined) {
      if (typeof isExamPeriod !== "boolean") return res.status(400).json({ error: "isExamPeriod must be boolean" });
      settings.isExamPeriod = isExamPeriod;
    }
    
    if (req.body.extraServices !== undefined) {
      if (!Array.isArray(req.body.extraServices)) {
        return res.status(400).json({ error: "extraServices must be an array" });
      }
      settings.extraServices = req.body.extraServices;
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.vendorId,
      { $set: settings },
      { new: true, select: "-password" }
    );
    if (!vendor) return res.status(404).json({ error: "Vendor not found" });
    res.json({ success: true, vendor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /vendor/:vendorId/revenue
exports.getRevenue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await Order.find({
      vendorId: req.params.vendorId,
      status: "Picked Up",
    });

    const todayOrders = orders.filter((o) => new Date(o.createdAt) >= today);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.estimatedPrice || 0), 0);

    res.json({
      today: {
        total: todayRevenue,
        commission: +(todayRevenue * 0.1).toFixed(2),
        net: +(todayRevenue * 0.9).toFixed(2),
        ordersCount: todayOrders.length,
      },
      total: {
        revenue: orders.reduce((sum, o) => sum + (o.estimatedPrice || 0), 0),
        ordersCount: orders.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /vendor/logout
exports.logoutVendor = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    await Vendor.findByIdAndUpdate(vendorId, { isOnline: false });

    const io = req.app.get("io");
    io?.emit("vendor-status-change", { vendorId, isOnline: false });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
