const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Make io accessible in routes
app.set("io", io);

// Routes
const vendorRoutes = require("./routes/vendor.routes");
const orderRoutes = require("./routes/order.routes");

app.use("/vendor", vendorRoutes);
app.use("/orders", orderRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "OK" }));

// Socket.io
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);

  socket.on("vendor-online", (vendorId) => {
    socket.join(`vendor-${vendorId}`);
    io.emit("vendor-status-change", { vendorId, isOnline: true });
    console.log(`✅ Vendor ${vendorId} is online`);
  });

  socket.on("vendor-offline", (vendorId) => {
    io.emit("vendor-status-change", { vendorId, isOnline: false });
    console.log(`❌ Vendor ${vendorId} went offline`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
