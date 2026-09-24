const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");

router.post("/", upload.any(), (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const port = process.env.PORT || 5000;
    const uploadedList = files.map(file => ({
      url: `http://localhost:${port}/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    }));

    const primary = uploadedList[0];

    res.json({
      success: true,
      url: primary.url,
      filename: primary.filename,
      originalName: primary.originalName,
      fileCount: uploadedList.length,
      files: uploadedList,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;