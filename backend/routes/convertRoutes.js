const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const convertFile = require("../services/conversionService");

router.post("/", upload.any(), convertFile);

module.exports = router;