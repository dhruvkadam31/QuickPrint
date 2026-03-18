const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const convertFile = require("../services/conversionService");

router.post("/", upload.single("file"), convertFile);

module.exports = router;