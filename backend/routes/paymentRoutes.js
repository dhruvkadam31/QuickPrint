const express = require("express");
const router = express.Router();

router.get("/queue", (req, res) => {
  res.send("Queue route working");
});

module.exports = router;