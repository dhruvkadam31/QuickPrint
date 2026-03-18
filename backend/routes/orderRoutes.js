const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Order management
router.get('/queue', orderController.getQueue);
router.get('/user/:userId', orderController.getUserOrders);
router.get('/user-active/:userId', orderController.getUserActiveOrders);
router.get('/queue-position/:orderId', orderController.getQueuePositionController);
router.patch('/:orderId', orderController.updateOrderStatus);
router.patch('/update-status', orderController.updateOrderStatus);

module.exports = router;