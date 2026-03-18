const express = require('express');
const router = express.Router();
const printController = require('../controllers/printController');

router.get('/printers', printController.getPrintersList);
router.post('/print', printController.executePrint);

module.exports = router;