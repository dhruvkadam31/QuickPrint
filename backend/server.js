const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const bcrypt = require("bcryptjs");
const { apiLimiter } = require("./middleware/rateLimiter");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Security & Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(apiLimiter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/processed", express.static(path.join(__dirname, "processed")));

// Make io accessible in routes
app.set("io", io);

// Routes
const vendorRoutes = require("./routes/vendor.routes");
const orderRoutes = require("./routes/order.routes");
const mlRoutes = require("./routes/ml.routes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/authRoutes");
const paymentsRoutes = require("./routes/payments.routes");

app.use("/vendor", vendorRoutes);
app.use("/orders", orderRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/payments", paymentsRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "OK", timestamp: new Date() }));
app.get("/", (req, res) => res.json({ status: "QuickPrint Smart Printing Backend Operational", version: "2.0" }));

// Socket.io
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("vendor-online", async (vendorId) => {
    socket.vendorId = vendorId;

    try {
      await require("./models/Vendor").findByIdAndUpdate(vendorId, {
        isOnline: true,
      });
      io.emit("vendor-status-change", { vendorId, isOnline: true });
      console.log(`✅ Vendor ${vendorId} is online`);
    } catch (e) {
      console.warn("Vendor online error:", e.message);
    }
  });

  socket.on("disconnect", async () => {
    console.log("🔌 Client disconnected:", socket.id);

    if (socket.vendorId) {
      try {
        await require("./models/Vendor").findByIdAndUpdate(socket.vendorId, {
          isOnline: false,
        });

        io.emit("vendor-status-change", {
          vendorId: socket.vendorId,
          isOnline: false,
        });

        console.log(`❌ Vendor ${socket.vendorId} went offline`);
      } catch (e) {
        console.warn("Vendor offline error:", e.message);
      }
    }
  });
});

// Seed default vendor if database has no vendors
async function seedDefaultVendor() {
  try {
    const Vendor = require("./models/Vendor");
    const count = await Vendor.countDocuments();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash("vendor123", 10);
      await Vendor.create({
        name: "Campus Print Station",
        email: "vendor@quickprint.com",
        password: hashedPassword,
        shopName: "QuickPrint Campus Hub",
        phone: "9876543210",
        isOnline: true,
        shopOpen: true,
        bwPricePerPage: 1.5,
        colorPricePerPage: 5.0,
        bindingPrice: 20.0,
      });
      console.log("🌱 Default vendor seeded: vendor@quickprint.com / vendor123");
    }
  } catch (err) {
    console.warn("Vendor seed note:", err.message);
  }
}

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/quickprint";
const PORT = process.env.PORT || 5000;

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    await seedDefaultVendor();
    server.listen(PORT, () => {
      console.log(`🚀 QuickPrint Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    // Still start server in fallback/offline mode if mongo not running locally
    server.listen(PORT, () => {
      console.log(`⚠️ QuickPrint Server running on port ${PORT} (MongoDB offline mode)`);
    });
  });
