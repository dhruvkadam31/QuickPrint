const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const upload = require('../middleware/upload');

router.post('/upload', upload.single('file'), fileController.uploadFile);
router.post('/convert', upload.single('file'), fileController.convertFile);

module.exports = router;