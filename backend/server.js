require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { connectToMongoDB } = require("./config/db");

const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const convertRoutes = require("./routes/convertRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Shop status (in-memory for demo)
let shopOpen = true;

// Routes
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/convert", convertRoutes);

// Shop status endpoints
app.get("/api/shop-status", (req, res) => {
  res.json({ open: shopOpen });
});

app.post("/api/shop-status", (req, res) => {
  const { open } = req.body;
  if (typeof open === 'boolean') {
    shopOpen = open;
    res.json({ success: true, open: shopOpen });
  } else {
    res.status(400).json({ error: "Invalid status" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "QuickPrint Server Running",
    status: "healthy",
    endpoints: {
      upload: "/api/upload",
      convert: "/api/convert",
      payments: "/api/payments",
      orders: "/api/orders",
      shopStatus: "/api/shop-status"
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.stack);
  res.status(500).json({ 
    error: err.message,
    success: false 
  });
});

// Start server
const startServer = async () => {
  try {
    await connectToMongoDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`📁 Uploads directory: ${uploadsDir}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();