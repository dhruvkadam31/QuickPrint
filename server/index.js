const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv');
const path = require("path");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const sharp = require("sharp");
const pdf = require("pdf-parse");
const fs = require("fs");
const axios = require('axios');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// In index.js - Add this CORS configuration at the top
app.use(cors({
  origin: "http://localhost:3000", // Your React app URL
  credentials: true
}));
// ----------------------
// Local uploads folder
// ----------------------

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve converted PDFs so client can download them
app.use("/files", express.static(path.join(__dirname, "converted")));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ----------------------
// Razorpay Configuration
// ----------------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ----------------------
// MongoDB Connection
// ----------------------
let db;
let ordersCollection;
let vendorsCollection;
const pendingOrders = new Map();

const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    db = client.db("printing_service");
    ordersCollection = db.collection("orders");
    vendorsCollection = db.collection("vendors");
    
    await initializeDefaultVendors();
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

// Initialize default vendors VEN001 & VEN002 - FIXED VERSION
async function initializeDefaultVendors() {
  try {
    const defaultVendors = [
      {
        vendorId: "VEN001",
        name: "City Center Print Hub",
        email: "vendor1@quickprint.com",
        password: "admin123", // Plain text password
        address: "123 Main Street, City Center",
        phone: "+91 9876543210",
        services: ["Print", "Lamination", "Photo Binding"],
        isActive: true,
        shopOpen: true,
        commissionRate: 10,
        createdAt: new Date(),
        lastLogin: null
      },
      {
        vendorId: "VEN002", 
        name: "University Print Station",
        email: "vendor2@quickprint.com",
        password: "admin456", // Plain text password
        address: "456 College Road, Near University Campus",
        phone: "+91 9876543211",
        services: ["Print", "Lamination", "College Pages"],
        isActive: true,
        shopOpen: true,
        commissionRate: 10,
        createdAt: new Date(),
        lastLogin: null
      }
    ];

    for (const vendor of defaultVendors) {
      const existingVendor = await vendorsCollection.findOne({ vendorId: vendor.vendorId });
      if (!existingVendor) {
        await vendorsCollection.insertOne(vendor);
        console.log(`✅ Created vendor: ${vendor.name} (${vendor.vendorId})`);
      } else {
        // Update existing vendor with correct password
        await vendorsCollection.updateOne(
          { vendorId: vendor.vendorId },
          { $set: { 
            password: vendor.password,
            email: vendor.email,
            isActive: true,
            shopOpen: true 
          }}
        );
        console.log(`✅ Updated vendor: ${vendor.name} (${vendor.vendorId})`);
      }
    }
    
    console.log("✅ Default vendors initialized/updated");
    
    // Verify vendors exist
    const vendorCount = await vendorsCollection.countDocuments();
    console.log(`📊 Total vendors in database: ${vendorCount}`);
    
  } catch (err) {
    console.error("❌ Error initializing vendors:", err);
  }
}

// ----------------------
// Helper Functions
// ----------------------

// Helper function to calculate estimated wait time
function calculateWaitTime(queueLength) {
  const avgTimePerOrder = 10; // minutes per order
  return queueLength * avgTimePerOrder;
}

// ----------------------
// Enhanced Queue Position Endpoints
// ----------------------

// Enhanced queue position endpoint with real-time data
app.get("/queue-position/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await ordersCollection.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    // Get all orders in queue for this vendor (Queued + In Progress)
    const queueOrders = await ordersCollection.find({
      vendorId: order.vendorId,
      status: { $in: ["Queued", "In Progress"] }
    }).sort({ createdAt: 1 }).toArray();
    
    // Calculate position
    const position = queueOrders.findIndex(o => o.orderId === orderId) + 1;
    
    // Get vendor info for estimated wait time
    const vendor = await vendorsCollection.findOne({ vendorId: order.vendorId });
    const estimatedWaitTime = calculateWaitTime(position - 1); // position-1 because current order is included
    
    // Get orders ahead in queue
    const ordersAhead = queueOrders.slice(0, position - 1);
    
    res.json({
      success: true,
      orderId: orderId,
      position: position,
      totalInQueue: queueOrders.length,
      estimatedWaitTime: estimatedWaitTime,
      vendorName: vendor?.name,
      ordersAhead: ordersAhead.map(o => ({
        orderId: o.orderId,
        status: o.status,
        serviceType: o.serviceType
      })),
      currentStatus: order.status,
      lastUpdated: new Date()
    });
    
  } catch (err) {
    console.error("Queue position error:", err);
    res.status(500).json({ error: "Failed to get queue position" });
  }
});

// Additional endpoint to get all user's active orders with queue positions
app.get("/user-active-orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const activeOrders = await ordersCollection.find({
      userId: userId,
      status: { $in: ["Queued", "In Progress"] }
    }).sort({ createdAt: -1 }).toArray();
    
    // Get queue positions for all active orders
    const ordersWithQueue = await Promise.all(
      activeOrders.map(async (order) => {
        try {
          const queueResponse = await axios.get(`http://localhost:5000/queue-position/${order.orderId}`);
          return {
            ...order,
            queuePosition: queueResponse.data.position,
            totalInQueue: queueResponse.data.totalInQueue,
            estimatedWaitTime: queueResponse.data.estimatedWaitTime,
            vendorName: queueResponse.data.vendorName
          };
        } catch (error) {
          console.error(`Error getting queue position for order ${order.orderId}:`, error);
          return {
            ...order,
            queuePosition: 0,
            totalInQueue: 0,
            estimatedWaitTime: 0,
            vendorName: "Unknown"
          };
        }
      })
    );
    
    res.json({
      success: true,
      orders: ordersWithQueue
    });
    
  } catch (err) {
    console.error("User active orders error:", err);
    res.status(500).json({ error: "Failed to get active orders" });
  }
});

// ----------------------
// Vendor Authentication Routes - FIXED
// ----------------------

// Vendor login - FIXED VERSION
app.post("/vendor/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Vendor login attempt:", email);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find vendor by email
    const vendor = await vendorsCollection.findOne({ email });
    console.log("📋 Found vendor:", vendor ? vendor.vendorId : "NOT FOUND");

    if (!vendor) {
      console.log("❌ Vendor not found for email:", email);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if vendor is active
    if (!vendor.isActive) {
      console.log("❌ Vendor account inactive:", vendor.vendorId);
      return res.status(403).json({ error: "Vendor account is deactivated" });
    }

    // Simple password check - FIXED: Compare with actual password field
    console.log("🔑 Password check:", { input: password, stored: vendor.password });
    const validPassword = vendor.password === password;

    if (!validPassword) {
      console.log("❌ Invalid password for vendor:", vendor.vendorId);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await vendorsCollection.updateOne(
      { vendorId: vendor.vendorId },
      { $set: { lastLogin: new Date() } }
    );

    console.log("✅ Vendor login successful:", vendor.vendorId);

    res.json({
      success: true,
      message: "Login successful",
      vendor: {
        vendorId: vendor.vendorId,
        name: vendor.name,
        email: vendor.email,
        shopOpen: vendor.shopOpen,
        address: vendor.address,
        phone: vendor.phone
      }
    });

  } catch (err) {
    console.error("❌ Vendor login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get all active vendors (for user selection)
app.get("/vendors", async (req, res) => {
  try {
    const vendors = await vendorsCollection.find({ 
      isActive: true,
      shopOpen: true 
    }).toArray();

    // Add queue information to each vendor
    const vendorsWithQueue = await Promise.all(
      vendors.map(async (vendor) => {
        const queueOrders = await ordersCollection.find({
          vendorId: vendor.vendorId,
          status: { $in: ["Queued", "In Progress"] }
        }).toArray();

        return {
          vendorId: vendor.vendorId,
          name: vendor.name,
          email: vendor.email,
          address: vendor.address,
          phone: vendor.phone,
          services: vendor.services,
          shopOpen: vendor.shopOpen,
          currentQueue: queueOrders.length,
          estimatedWaitTime: calculateWaitTime(queueOrders.length),
          queueOrders: queueOrders.map(order => ({
            orderId: order.orderId,
            status: order.status,
            createdAt: order.createdAt
          }))
        };
      })
    );

    res.json({
      success: true,
      vendors: vendorsWithQueue
    });

  } catch (err) {
    console.error("❌ Error fetching vendors:", err);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// Get vendor by ID
app.get("/vendors/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const vendor = await vendorsCollection.findOne({ vendorId });
    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    // Get vendor's current queue
    const queueOrders = await ordersCollection.find({
      vendorId: vendorId,
      status: { $in: ["Queued", "In Progress"] }
    }).toArray();

    const vendorWithQueue = {
      vendorId: vendor.vendorId,
      name: vendor.name,
      email: vendor.email,
      address: vendor.address,
      phone: vendor.phone,
      services: vendor.services,
      shopOpen: vendor.shopOpen,
      currentQueue: queueOrders.length,
      estimatedWaitTime: calculateWaitTime(queueOrders.length),
      queueOrders: queueOrders
    };

    res.json({
      success: true,
      vendor: vendorWithQueue
    });

  } catch (err) {
    console.error("❌ Error fetching vendor:", err);
    res.status(500).json({ error: "Failed to fetch vendor" });
  }
});

// Update vendor shop status
app.patch("/vendors/:vendorId/shop-status", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { shopOpen } = req.body;

    const result = await vendorsCollection.updateOne(
      { vendorId },
      { $set: { shopOpen, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Vendor not found" });
    }

    res.json({
      success: true,
      message: `Shop is now ${shopOpen ? 'OPEN' : 'CLOSED'}`,
      shopOpen
    });

  } catch (err) {
    console.error("❌ Error updating shop status:", err);
    res.status(500).json({ error: "Failed to update shop status" });
  }
});

// ----------------------
// Revenue Analytics Endpoints
// ----------------------

// Get vendor revenue data
app.get("/vendors/:vendorId/revenue", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6); // Last 7 days

    console.log("💰 Fetching revenue data for vendor:", vendorId);
    console.log("📅 Date range:", { startOfToday, startOfWeek });

    // Get today's completed orders
    const todayOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up",
      pickedUpAt: { $gte: startOfToday }
    }).toArray();

    console.log("📊 Today's completed orders:", todayOrders.length);

    // Get weekly orders
    const weeklyOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up", 
      pickedUpAt: { $gte: startOfWeek }
    }).toArray();

    console.log("📈 Weekly completed orders:", weeklyOrders.length);

    // Calculate today's revenue
    const todayTotal = todayOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
    const todayCommission = todayTotal * 0.10;
    const todayNet = todayTotal - todayCommission;

    console.log("💵 Today's revenue breakdown:", { todayTotal, todayCommission, todayNet });

    // Calculate weekly revenue by day
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = weeklyOrders.filter(order => {
        const orderDate = new Date(order.pickedUpAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });

      const dayTotal = dayOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
      const dayCommission = dayTotal * 0.10;
      const dayNet = dayTotal - dayCommission;

      weeklyData.push({
        date: dateStr,
        total: dayTotal,
        commission: dayCommission,
        net: dayNet,
        ordersCount: dayOrders.length
      });
    }

    console.log("📆 Weekly data prepared:", weeklyData);

    res.json({
      success: true,
      today: {
        total: todayTotal,
        commission: todayCommission,
        net: todayNet,
        ordersCount: todayOrders.length
      },
      weekly: weeklyData
    });

  } catch (err) {
    console.error("❌ Revenue data error:", err);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch revenue data",
      details: err.message 
    });
  }
});

// Get vendor revenue statistics
app.get("/vendors/:vendorId/revenue/stats", async (req, res) => {
  try {
    const { vendorId } = req.params;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Monthly revenue
    const monthlyOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up",
      pickedUpAt: { $gte: startOfMonth }
    }).toArray();

    const monthlyTotal = monthlyOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
    const monthlyCommission = monthlyTotal * 0.10;
    const monthlyNet = monthlyTotal - monthlyCommission;

    // Yearly revenue
    const yearlyOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up",
      pickedUpAt: { $gte: startOfYear }
    }).toArray();

    const yearlyTotal = yearlyOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
    const yearlyCommission = yearlyTotal * 0.10;
    const yearlyNet = yearlyTotal - yearlyCommission;

    // All-time stats
    const allTimeOrders = await ordersCollection.find({
      vendorId,
      status: "Picked Up"
    }).toArray();

    const allTimeTotal = allTimeOrders.reduce((sum, order) => sum + order.estimatedPrice, 0);
    const allTimeCommission = allTimeTotal * 0.10;
    const allTimeNet = allTimeTotal - allTimeCommission;

    res.json({
      success: true,
      stats: {
        monthly: {
          total: monthlyTotal,
          commission: monthlyCommission,
          net: monthlyNet,
          ordersCount: monthlyOrders.length
        },
        yearly: {
          total: yearlyTotal,
          commission: yearlyCommission,
          net: yearlyNet,
          ordersCount: yearlyOrders.length
        },
        allTime: {
          total: allTimeTotal,
          commission: allTimeCommission,
          net: allTimeNet,
          ordersCount: allTimeOrders.length
        }
      }
    });

  } catch (err) {
    console.error("❌ Revenue stats error:", err);
    res.status(500).json({ error: "Failed to fetch revenue statistics" });
  }
});

// ----------------------
// Order Status Update Routes - FIXED
// ----------------------

// Update order status - IMPROVED VERSION
app.patch("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    console.log("🔄 Updating order status:", { orderId, status });

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // Try to find order by different ID fields
    let order = await ordersCollection.findOne({ orderId: orderId });
    
    if (!order) {
      // Try with _id if orderId doesn't work
      try {
        order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
      } catch (e) {
        // Ignore ObjectId conversion errors
      }
    }

    if (!order) {
      console.log("❌ Order not found with ID:", orderId);
      return res.status(404).json({ error: "Order not found" });
    }

    const updateData = {
      status: status,
      updatedAt: new Date()
    };

    // Add timestamps for specific status changes
    if (status === "In Progress") {
      updateData.printStartedAt = new Date();
    } else if (status === "Ready") {
      updateData.readyAt = new Date();
    } else if (status === "Picked Up") {
      updateData.pickedUpAt = new Date();
    }

    const result = await ordersCollection.findOneAndUpdate(
      { _id: order._id }, // Use _id for reliable updates
      { $set: updateData },
      { returnDocument: "after" }
    );

    console.log("✅ Order status updated successfully:", result.value?.orderId);

    res.json({
      success: true,
      message: `✅ Order status updated to ${status}`,
      order: result.value,
    });

  } catch (err) {
    console.error("❌ Error updating order:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Alternative endpoint that accepts orderId in body
app.patch("/orders/update-status", async (req, res) => {
  try {
    const { orderId, status } = req.body;

    console.log("🔄 Updating order status via body:", { orderId, status });

    if (!orderId || !status) {
      return res.status(400).json({ error: "Order ID and status are required" });
    }

    // Try to find order by different ID fields
    let order = await ordersCollection.findOne({ orderId: orderId });
    
    if (!order) {
      // Try with _id if orderId doesn't work
      try {
        order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
      } catch (e) {
        // Ignore ObjectId conversion errors
      }
    }

    if (!order) {
      console.log("❌ Order not found with ID:", orderId);
      return res.status(404).json({ error: "Order not found" });
    }

    const updateData = {
      status: status,
      updatedAt: new Date()
    };

    if (status === "In Progress") {
      updateData.printStartedAt = new Date();
    } else if (status === "Ready") {
      updateData.readyAt = new Date();
    } else if (status === "Picked Up") {
      updateData.pickedUpAt = new Date();
    }

    const result = await ordersCollection.findOneAndUpdate(
      { _id: order._id },
      { $set: updateData },
      { returnDocument: "after" }
    );

    res.json({
      success: true,
      message: `✅ Order status updated to ${status}`,
      order: result.value,
    });

  } catch (err) {
    console.error("❌ Error updating order status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Debug endpoint to check orders
app.get("/debug/orders", async (req, res) => {
  try {
    const orders = await ordersCollection.find({}).toArray();
    res.json({
      totalOrders: orders.length,
      orders: orders.map(o => ({
        _id: o._id,
        orderId: o.orderId,
        status: o.status,
        vendorId: o.vendorId,
        createdAt: o.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint to check orders by vendor
app.get("/debug/orders-by-vendor/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const orders = await ordersCollection.find({ 
      vendorId: vendorId 
    }).toArray();
    
    res.json({
      vendorId: vendorId,
      totalOrders: orders.length,
      orders: orders.map(o => ({
        _id: o._id,
        orderId: o.orderId,
        status: o.status,
        vendorId: o.vendorId,
        userId: o.userId,
        createdAt: o.createdAt,
        serviceType: o.serviceType
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint to check vendors
app.get("/debug/vendors", async (req, res) => {
  try {
    const vendors = await vendorsCollection.find({}).toArray();
    res.json({
      totalVendors: vendors.length,
      vendors: vendors.map(v => ({
        vendorId: v.vendorId,
        email: v.email,
        password: v.password,
        isActive: v.isActive,
        shopOpen: v.shopOpen
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// Updated Order Routes with Vendor Assignment
// ----------------------

// ✅ Step 1: Initiate payment with vendor assignment
app.post("/initiate-order", async (req, res) => {
  try {
    const { userId, serviceType, fileUrl, quantity, instructions, estimatedPrice, pageCount, totalPages, color, sides, orientation, vendorId } = req.body;
    
    console.log("📥 Initiating order with vendor:", { userId, vendorId, estimatedPrice });

    // Validate required fields including vendorId
    if (!userId || !serviceType || !fileUrl || !estimatedPrice || !vendorId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify vendor exists and is active
    const vendor = await vendorsCollection.findOne({ 
      vendorId, 
      isActive: true,
      shopOpen: true 
    });
    
    if (!vendor) {
      return res.status(400).json({ error: "Selected vendor is not available" });
    }

    // Calculate commission (10%)
    const commission = (estimatedPrice * 0.10);
    const vendorEarnings = estimatedPrice - commission;

    // Create temporary order data
    const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tempOrder = {
      tempOrderId,
      userId,
      vendorId,
      vendorName: vendor.name,
      serviceType,
      fileUrl,
      quantity: quantity || 1,
      instructions: instructions || "",
      estimatedPrice,
      commission,
      vendorEarnings,
      pageCount: pageCount || 1,
      totalPages: totalPages || quantity || 1,
      color: color || "B&W",
      sides: sides || "Single",
      orientation: orientation || "Portrait",
      status: "payment_pending",
      createdAt: new Date()
    };

    // Store temporary order
    pendingOrders.set(tempOrderId, tempOrder);
    setTimeout(() => {
      pendingOrders.delete(tempOrderId);
    }, 30 * 60 * 1000);

    // Create Razorpay order
    const options = {
      amount: Math.round(estimatedPrice * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        tempOrderId: tempOrderId,
        serviceType: serviceType,
        vendorId: vendorId
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);
    
    console.log("✅ Razorpay order created for vendor:", vendorId);

    res.json({
      success: true,
      razorpayOrder: razorpayOrder,
      tempOrderId: tempOrderId,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("❌ Order initiation error:", err);
    res.status(500).json({ error: "Error initiating order" });
  }
});

// ✅ Step 2: Verify payment and create order with vendor assignment
app.post("/verify-payment-complete-order", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tempOrderId } = req.body;

    console.log("🔍 Verifying payment for tempOrder:", tempOrderId);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !tempOrderId) {
      return res.status(400).json({ 
        success: false, 
        error: "Payment verification data missing" 
      });
    }

    // Verify payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Payment signature verification failed");
      return res.status(400).json({ 
        success: false, 
        error: "Payment verification failed" 
      });
    }

    // Retrieve temporary order data
    const tempOrder = pendingOrders.get(tempOrderId);
    if (!tempOrder) {
      return res.status(404).json({ 
        success: false, 
        error: "Order data not found or expired" 
      });
    }

    // Get queue position before creating order
    const queuePosition = await getQueuePosition(tempOrder.vendorId);

    // Create the actual order in database
    const newOrder = {
      orderId: Date.now().toString(),
      userId: tempOrder.userId,
      vendorId: tempOrder.vendorId,
      vendorName: tempOrder.vendorName,
      serviceType: tempOrder.serviceType,
      fileUrl: tempOrder.fileUrl,
      quantity: tempOrder.quantity,
      instructions: tempOrder.instructions,
      estimatedPrice: tempOrder.estimatedPrice,
      commission: tempOrder.commission,
      vendorEarnings: tempOrder.vendorEarnings,
      pageCount: tempOrder.pageCount,
      totalPages: tempOrder.totalPages,
      color: tempOrder.color,
      sides: tempOrder.sides,
      orientation: tempOrder.orientation,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: "completed",
      status: "Queued",
      queuePosition: queuePosition,
      createdAt: new Date(),
      paidAt: new Date()
    };

    // Save to MongoDB
    const result = await ordersCollection.insertOne(newOrder);
    
    // Clean up temporary data
    pendingOrders.delete(tempOrderId);

    console.log("✅ Order created for vendor:", tempOrder.vendorId, "Queue position:", queuePosition);

    res.json({ 
      success: true, 
      orderId: newOrder.orderId,
      vendorId: newOrder.vendorId,
      queuePosition: newOrder.queuePosition,
      vendorName: newOrder.vendorName,
      paymentId: razorpay_payment_id,
      message: "Payment verified and order created successfully"
    });

  } catch (err) {
    console.error("❌ Payment verification error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to get queue position
async function getQueuePosition(vendorId) {
  const queueCount = await ordersCollection.countDocuments({
    vendorId,
    status: { $in: ["Queued", "In Progress"] }
  });
  return queueCount + 1; // New order position
}

// ----------------------
// Updated Order Management Routes
// ----------------------

// Get vendor-specific orders
app.get("/vendors/:vendorId/orders", async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    const orders = await ordersCollection.find({ 
      vendorId,
      paymentStatus: "completed" 
    }).sort({ createdAt: 1 }).toArray();
    
    res.json(orders);
  } catch (err) {
    console.error("❌ Error fetching vendor orders:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's orders with vendor info
app.get("/orders/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await ordersCollection.find({ 
      userId,
      paymentStatus: "completed" 
    }).sort({ createdAt: -1 }).toArray();
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get queue with vendor filtering
app.get("/queue", async (req, res) => {
  try {
    const { vendorId } = req.query;
    let query = {};
    
    if (vendorId) {
      query.vendorId = vendorId;
    }
    
    const queue = await ordersCollection.find(query).sort({ createdAt: 1 }).toArray();
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// Print Service Configuration
// ----------------------
const printers = [
  { 
    id: "printer1", 
    name: "HP LaserJet Pro M404dn", 
    location: "Counter 1",
    type: "laser",
    supportsColor: false,
    supportsDuplex: true
  },
  { 
    id: "printer2", 
    name: "Canon imageCLASS LBP623Cdw", 
    location: "Counter 2",
    type: "laser", 
    supportsColor: true,
    supportsDuplex: true
  },
  { 
    id: "printer3", 
    name: "Epson WorkForce WF-2860", 
    location: "Back Office",
    type: "inkjet",
    supportsColor: true,
    supportsDuplex: true
  },
  { 
    id: "printer4", 
    name: "Brother HL-L8360CDW", 
    location: "Color Station",
    type: "laser",
    supportsColor: true,
    supportsDuplex: true
  }
];

// ----------------------
// Print Routes
// ----------------------

// ✅ Get available printers
app.get("/printers", (req, res) => {
  try {
    res.json({
      success: true,
      printers: printers
    });
  } catch (err) {
    console.error("❌ Error fetching printers:", err);
    res.status(500).json({ error: "Failed to fetch printers" });
  }
});

// ✅ Execute print job
app.post("/print", async (req, res) => {
  try {
    const { orderId, printerId, fileUrl, printConfig } = req.body;

    console.log("🖨️ Received print request:", { orderId, printerId, printConfig });

    // Validate required fields
    if (!orderId || !printerId || !fileUrl) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required print parameters" 
      });
    }

    // Find the selected printer
    const selectedPrinter = printers.find(p => p.id === printerId);
    if (!selectedPrinter) {
      return res.status(400).json({ 
        success: false, 
        error: "Printer not found" 
      });
    }

    // Validate printer compatibility
    if (printConfig.color === "Color" && !selectedPrinter.supportsColor) {
      return res.status(400).json({ 
        success: false, 
        error: `Selected printer (${selectedPrinter.name}) does not support color printing` 
      });
    }

    if (printConfig.sides === "Double" && !selectedPrinter.supportsDuplex) {
      return res.status(400).json({ 
        success: false, 
        error: `Selected printer (${selectedPrinter.name}) does not support double-sided printing` 
      });
    }

    // Find the order in database
    const order = await ordersCollection.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: "Order not found" 
      });
    }

    // Download the file for printing
    console.log("📥 Downloading file for printing:", fileUrl);
    let fileBuffer;
    
    try {
      if (fileUrl.startsWith('http://localhost:5000/')) {
        // Local file - read directly from filesystem
        const filename = path.basename(fileUrl);
        const filePath = path.join(__dirname, 'converted', filename);
        fileBuffer = fs.readFileSync(filePath);
      } else {
        // External URL - download using axios
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        fileBuffer = Buffer.from(response.data);
      }
    } catch (downloadError) {
      console.error("❌ File download error:", downloadError);
      return res.status(400).json({ 
        success: false, 
        error: "Failed to download file for printing" 
      });
    }

    // Simulate print processing
    console.log(`🖨️ Printing order ${orderId} on ${selectedPrinter.name}`);
    console.log(`📄 File size: ${fileBuffer.length} bytes`);
    console.log(`⚙️ Print configuration:`, {
      copies: printConfig.copies,
      color: printConfig.color,
      sides: printConfig.sides,
      orientation: printConfig.orientation,
      totalPages: order.totalPages || order.pageCount,
      totalSheets: printConfig.copies * (order.totalPages || order.pageCount)
    });

    // Calculate estimated print time (simulation)
    const pagesPerMinute = selectedPrinter.type === 'laser' ? 20 : 10;
    const totalPages = printConfig.copies * (order.totalPages || order.pageCount);
    const estimatedTimeSeconds = Math.ceil((totalPages / pagesPerMinute) * 60);

    // Simulate print processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update order status to "In Progress" if it was "Queued"
    if (order.status === "Queued") {
      await ordersCollection.updateOne(
        { orderId },
        { 
          $set: { 
            status: "In Progress",
            printerUsed: selectedPrinter.name,
            printStartedAt: new Date(),
            printConfig: printConfig
          } 
        }
      );
    } else {
      // For reprints, just log the print activity
      await ordersCollection.updateOne(
        { orderId },
        { 
          $push: {
            printHistory: {
              printedAt: new Date(),
              printer: selectedPrinter.name,
              config: printConfig
            }
          }
        }
      );
    }

    // Log print job
    console.log(`✅ Print job completed for order ${orderId}`);
    console.log(`⏱️ Estimated print time: ${estimatedTimeSeconds} seconds`);
    console.log(`📊 Total pages printed: ${totalPages}`);

    // Return success response
    res.json({
      success: true,
      message: "Print job sent successfully",
      orderId: orderId,
      printer: selectedPrinter.name,
      printConfig: printConfig,
      totalPages: totalPages,
      estimatedTime: estimatedTimeSeconds,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("❌ Print error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Print failed: " + err.message 
    });
  }
});

// ----------------------
// File Upload & Conversion Routes
// ----------------------

// ✅ Upload file route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Convert endpoint with LibreOffice only
app.post("/convert", upload.single("file"), async (req, res) => {
  console.log("🔄 /convert endpoint hit at:", new Date().toISOString());
  
  try {
    const file = req.file;
    console.log("📁 File received:", file ? {
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path
    } : "NO FILE");

    if (!file) {
      console.log("❌ No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    console.log("📄 File extension:", ext);
    
    const inputPath = file.path;
    const convertedDir = path.join(__dirname, "converted");
    
    if (!fs.existsSync(convertedDir)) {
      console.log("📁 Creating converted directory");
      fs.mkdirSync(convertedDir, { recursive: true });
    }

    const outputFileName = `${Date.now()}.pdf`;
    const outputPath = path.join(convertedDir, outputFileName);
    console.log("📤 Output path:", outputPath);

    let pageCount = 1;
    let conversionNote = "";

    // File conversion logic
    if ([".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".gif"].includes(ext)) {
      console.log("🖼️ Processing image file...");
      
      try {
        // Use Sharp for image to PDF conversion
        const image = sharp(inputPath);
        const metadata = await image.metadata();
        
        const pdfBuffer = await image
          .resize({
            width: 595,  // A4 width in points
            height: 842, // A4 height in points
            fit: 'inside',
            withoutEnlargement: true
          })
          .toFormat('pdf')
          .toBuffer();
        
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log("✅ Image converted to PDF using Sharp");
        conversionNote = "Converted with Sharp";
      } catch (sharpError) {
        console.error("❌ Sharp conversion failed:", sharpError.message);
        
        // Fallback: Try LibreOffice for image conversion
        try {
          console.log("🔄 Trying LibreOffice for image conversion...");
          await convertWithLibreOffice(inputPath, outputPath);
          conversionNote = "Converted with LibreOffice (fallback)";
        } catch (libreError) {
          console.error("❌ LibreOffice image conversion failed:", libreError);
          
          // Final fallback: Copy original file
          fs.copyFileSync(inputPath, outputPath);
          console.log("🔄 Using final fallback - copying original file");
          conversionNote = "Original file copied (conversion failed)";
        }
      }
      pageCount = 1; // Images are always 1 page
      
    } else if ([
      // Word documents
      ".doc", ".docx", ".dot", ".dotx", ".docm", ".odt",
      // PowerPoint presentations
      ".ppt", ".pptx", ".pot", ".potx", ".pps", ".ppsx", ".pptm", ".odp",
      // Excel spreadsheets
      ".xls", ".xlsx", ".xlt", ".xltx", ".xlsm", ".ods",
      // Other supported formats
      ".rtf", ".txt", ".html", ".htm"
    ].includes(ext)) {
      console.log("📄 Processing document with LibreOffice...");
      
      try {
        await convertWithLibreOffice(inputPath, outputPath);
        conversionNote = "Converted with LibreOffice";
      } catch (libreError) {
        console.error("❌ LibreOffice conversion failed:", libreError);
        
        // Fallback: Copy original file
        console.log("🔄 Using fallback - copying original file");
        fs.copyFileSync(inputPath, outputPath);
        conversionNote = "Original file copied (conversion failed)";
        pageCount = 1; // Default estimate
        
        // Return early since we can't count pages of unconverted file
        return res.json({
          success: true,
          pages: pageCount,
          url: `http://localhost:5000/files/${outputFileName}`,
          note: conversionNote
        });
      }
      
    } else if (ext === ".pdf") {
      console.log("📄 Processing PDF file...");
      fs.copyFileSync(inputPath, outputPath);
      console.log("✅ PDF copied");
      conversionNote = "PDF copied directly";
      
    } else {
      console.log("❌ Unsupported file type:", ext);
      return res.status(400).json({ 
        error: "Unsupported file type",
        supportedTypes: [
          "Images: PNG, JPG, JPEG, TIFF, BMP, GIF",
          "Documents: DOC, DOCX, PPT, PPTX, XLS, XLSX, ODT, ODP, ODS",
          "PDF: PDF"
        ]
      });
    }

    // Count pages for successfully converted PDF files
    if (fs.existsSync(outputPath) && ext !== ".pdf") {
      console.log("🔢 Counting pages...");
      try {
        const pdfBuffer = fs.readFileSync(outputPath);
        const pdfData = await pdf(pdfBuffer);
        pageCount = pdfData.numpages ?? pdfData.numPages ?? 1;
        console.log("📊 Page count determined:", pageCount);
      } catch (pageCountError) {
        console.error("❌ Page counting failed:", pageCountError);
        pageCount = 1; // Fallback to 1 page
      }
    } else if (ext === ".pdf") {
      // For original PDFs, count pages
      try {
        const pdfBuffer = fs.readFileSync(outputPath);
        const pdfData = await pdf(pdfBuffer);
        pageCount = pdfData.numpages ?? pdfData.numPages ?? 1;
        console.log("📊 PDF page count:", pageCount);
      } catch (error) {
        console.error("❌ PDF page counting failed:", error);
        pageCount = 1;
      }
    }

    const fileUrl = `http://localhost:5000/files/${outputFileName}`;
    console.log("🌐 File URL:", fileUrl);

    console.log("✅ Conversion successful, sending response...");
    res.json({
      success: true,
      pages: pageCount,
      url: fileUrl,
      note: conversionNote
    });

  } catch (err) {
    console.error("❌ Conversion error details:");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    res.status(500).json({ 
      success: false, 
      error: "Conversion failed", 
      details: err?.message || String(err) 
    });
  }
});

// LibreOffice conversion helper function
async function convertWithLibreOffice(inputPath, outputPath) {
  const convertedDir = path.dirname(outputPath);
  
  const libreOfficePaths = [
    '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"',
    '"C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe"',
    'soffice',
    'libreoffice',
  ];

  let lastError = null;

  for (const librePath of libreOfficePaths) {
    try {
      console.log(`🔄 Trying LibreOffice path: ${librePath}`);
      
      const command = `${librePath} --headless --convert-to pdf --outdir "${convertedDir}" "${inputPath}"`;
      
      console.log("🔧 Executing command:", command);
      
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
      
      if (stdout) console.log("✅ LibreOffice stdout:", stdout);
      if (stderr) console.log("⚠️ LibreOffice stderr:", stderr);
      
      // Check if conversion was successful
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const expectedOutput = path.join(convertedDir, `${baseName}.pdf`);
      
      if (fs.existsSync(expectedOutput)) {
        fs.renameSync(expectedOutput, outputPath);
        console.log("✅ Document converted successfully with LibreOffice");
        return { success: true, method: librePath };
      } else {
        console.log(`❌ Expected output not found: ${expectedOutput}`);
        lastError = new Error(`Conversion completed but output file not found`);
      }
    } catch (error) {
      console.log(`❌ LibreOffice path failed: ${librePath}`, error.message);
      lastError = error;
      continue;
    }
  }
  
  throw lastError || new Error('All LibreOffice paths failed');
}

// ----------------------
// Test endpoint
// ----------------------
app.get("/", (req, res) => {
  res.json({ 
    message: "QuickPrint Server is running!",
    timestamp: new Date().toISOString(),
    endpoints: {
      vendorLogin: "POST /vendor/login",
      getVendors: "GET /vendors",
      vendorRevenue: "GET /vendors/:vendorId/revenue",
      vendorRevenueStats: "GET /vendors/:vendorId/revenue/stats",
      debugVendors: "GET /debug/vendors",
      vendorOrders: "GET /vendors/:vendorId/orders",
      updateOrderStatus: "PATCH /orders/:orderId",
      updateOrderStatusAlt: "PATCH /orders/update-status",
      convert: "POST /convert",
      upload: "POST /upload",
      initiateOrder: "POST /initiate-order",
      print: "POST /print",
      printers: "GET /printers",
      queue: "GET /queue",
      queuePosition: "GET /queue-position/:orderId",
      userActiveOrders: "GET /user-active-orders/:userId"
    }
  });
});

// ----------------------
// Start server
// ----------------------
const startServer = async () => {
  await connectToMongoDB();
  app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
};

startServer().catch(console.error);