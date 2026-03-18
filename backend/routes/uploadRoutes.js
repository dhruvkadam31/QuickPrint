const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");

router.post("/", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;