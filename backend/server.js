const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const http = require('http');
const {Server} = require('socket.io');

// Load environment variables
dotenv.config();

// Import configuration
const { connectToMongoDB } = require('./config/database');
// Remove this line as it's now handled in database.js
// const { initializeDefaultVendors } = require('./utils/helpers');
const { getCollections } = require('./config/database');

// Import routes
const vendorRoutes = require('./routes/vendorRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const printRoutes = require('./routes/printRoutes');
const fileRoutes = require('./routes/fileRoutes');
const debugRoutes = require('./routes/debugRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket)=> {
  const socketVendorMap = {};
  console.log("Client connected:", socket.id);
  socket.on("vendor-online", async (vendorId) => {
    console.log("🟢 Vendor online:", vendorId);

  // 🔥 Map socket → vendor
    socketVendorMap[socket.id] = vendorId;

    try {
      const { vendorsCollection } = require('./config/database').getCollections();

      await vendorsCollection.updateOne(
        { vendorId },
        { $set: { isOnline: true } }
      );

   } catch (err) {
      console.error("Error setting vendor online:", err);
    }
  });
  socket.on("disconnect", async () => {
    const vendorId = socketVendorMap[socket.id];

    console.log("🔴 Socket disconnected:", socket.id);

    if (vendorId) {
      console.log("🔴 Vendor offline:", vendorId);

      try {
        const { vendorsCollection } = require('./config/database').getCollections();

        await vendorsCollection.updateOne(
          { vendorId },
          { $set: { isOnline: false } }
        );

      } catch (err) {
      console.error("Error setting vendor offline:", err);
      }

      delete socketVendorMap[socket.id];
    }
  });
});

app.use((req, res, next) => {
  console.log("🌐 Incoming Request:", req.method, req.url);
  next();
});
// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Create required directories
const uploadsDir = path.join(__dirname, 'uploads');
const convertedDir = path.join(__dirname, 'converted');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

if (!fs.existsSync(convertedDir)) {
  fs.mkdirSync(convertedDir, { recursive: true });
  console.log('📁 Created converted directory');
}

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/files", express.static(path.join(__dirname, "converted")));

// Routes
app.use('/vendor', vendorRoutes);
app.use('/order', orderRoutes);
app.use('/', paymentRoutes);
app.use('/', printRoutes);
app.use('/', fileRoutes);
app.use('/debug', debugRoutes);

// Home route
app.get("/", (req, res) => {
  res.json({ 
    message: "QuickPrint Server is running!",
    timestamp: new Date().toISOString(),
    endpoints: {
      vendor: "POST /vendors/login, GET /vendors, GET /vendors/:vendorId",
      revenue: "GET /vendors/:vendorId/revenue, GET /vendors/:vendorId/revenue/stats",
      orders: "GET /vendors/:vendorId/orders, GET /orders/user/:userId, PATCH /orders/:orderId",
      queue: "GET /orders/queue, GET /orders/queue-position/:orderId",
      payment: "POST /initiate-order, POST /verify-payment-complete-order",
      print: "GET /printers, POST /print",
      files: "POST /upload, POST /convert",
      debug: "GET /debug/orders, GET /debug/vendors"
    }
  });
});

// Initialize and start server
const startServer = async () => {
  try {
    await connectToMongoDB(); // This now handles vendor initialization internally
    
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, ()=>{
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();