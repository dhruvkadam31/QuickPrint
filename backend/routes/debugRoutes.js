const express = require('express');
const router = express.Router();
const { getCollections } = require('../config/database');

router.get('/orders', async (req, res) => {
  try {
    const { ordersCollection } = getCollections();
    const orders = await ordersCollection.find({}).toArray();
    res.json({
      totalOrders: orders.length,
      orders: orders.map(o => ({
        _id: o._id,
        orderId: o.orderId,
        status: o.status,
        vendorId: o.vendorId,
        createdAt: o.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders-by-vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { ordersCollection } = getCollections();
    
    const orders = await ordersCollection.find({ vendorId }).toArray();
    
    res.json({
      vendorId,
      totalOrders: orders.length,
      orders: orders.map(o => ({
        _id: o._id,
        orderId: o.orderId,
        status: o.status,
        vendorId: o.vendorId,
        userId: o.userId,
        createdAt: o.createdAt,
        serviceType: o.serviceType
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vendors', async (req, res) => {
  try {
    const { vendorsCollection } = getCollections();
    const vendors = await vendorsCollection.find({}).toArray();
    res.json({
      totalVendors: vendors.length,
      vendors: vendors.map(v => ({
        vendorId: v.vendorId,
        email: v.email,
        password: v.password,
        isActive: v.isActive,
        shopOpen: v.shopOpen
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;