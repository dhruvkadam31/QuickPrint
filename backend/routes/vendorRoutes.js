const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const revenueController = require('../controllers/revenueController');
const orderController = require('../controllers/orderController');

// Vendor authentication
router.post('/login', vendorController.vendorLogin);

// Vendor management
router.get('/', vendorController.getAllVendors);
router.get('/:vendorId', vendorController.getVendorById);
router.patch('/:vendorId/shop-status', vendorController.updateShopStatus);

// Vendor orders
router.get('/:vendorId/orders', orderController.getVendorOrders);

// Vendor revenue
router.get('/:vendorId/revenue', revenueController.getVendorRevenue);
router.get('/:vendorId/revenue/stats', revenueController.getVendorRevenueStats);

module.exports = router;