const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/initiate-order', paymentController.initiateOrder);
router.post('/verify-payment-complete-order', paymentController.verifyPayment);

module.exports = router;