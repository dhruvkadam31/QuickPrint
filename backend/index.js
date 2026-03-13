const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv');
const path = require("path");
const { fileURLToPath } = require("url");
const multer = require("multer");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const sharp = require("sharp");
const pdf = require("pdf-parse");
const docxConverter = require("docx-pdf");
const pptx2pdf = require("pptx2pdf");
const fs = require("fs");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");
    await client.connect();
    console.log("✅ Connected to MongoDB");
    
    db = client.db("printing_service");
    ordersCollection = db.collection("orders");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};

// ----------------------
// Temporary Order Storage (in-memory for demo, use Redis in production)
// ----------------------
const pendingOrders = new Map();

// ----------------------
// Payment Routes
// ----------------------

// ✅ Step 1: Initiate payment and store temporary order data
app.post("/initiate-order", async (req, res) => {
  try {
    const { userId, serviceType, fileUrl, quantity, instructions, estimatedPrice } = req.body;
    
    console.log("📥 Initiating order with payment:", { userId, serviceType, estimatedPrice });

    // Validate required fields
    if (!userId || !serviceType || !fileUrl || !estimatedPrice) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create temporary order data (will be stored after payment)
    const tempOrderId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const tempOrder = {
      tempOrderId,
      userId,
      serviceType,
      fileUrl,
      quantity: quantity || 1,
      instructions: instructions || "",
      estimatedPrice,
      status: "payment_pending",
      createdAt: new Date()
    };

    // Store temporary order (expires after 30 minutes)
    pendingOrders.set(tempOrderId, tempOrder);
    setTimeout(() => {
      pendingOrders.delete(tempOrderId);
    }, 30 * 60 * 1000);

    // Create Razorpay order
    const options = {
      amount: Math.round(estimatedPrice * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        tempOrderId: tempOrderId,
        serviceType: serviceType
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);
    
    console.log("✅ Razorpay order created:", razorpayOrder.id);

    res.json({
      success: true,
      razorpayOrder: razorpayOrder,
      tempOrderId: tempOrderId,
      key: process.env.RAZORPAY_KEY_ID // Frontend needs this to open Razorpay
    });

  } catch (err) {
    console.error("❌ Order initiation error:", err);
    res.status(500).json({ error: "Error initiating order" });
  }
});

// ✅ Step 2: Verify payment and create actual order in MongoDB
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

    // Create the actual order in database
    const newOrder = {
      orderId: Date.now().toString(),
      userId: tempOrder.userId,
      serviceType: tempOrder.serviceType,
      fileUrl: tempOrder.fileUrl,
      quantity: tempOrder.quantity,
      instructions: tempOrder.instructions,
      estimatedPrice: tempOrder.estimatedPrice,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentStatus: "completed",
      status: "Queued",
      createdAt: new Date(),
      paidAt: new Date()
    };

    // Save to MongoDB
    const result = await ordersCollection.insertOne(newOrder);
    
    // Clean up temporary data
    pendingOrders.delete(tempOrderId);

    console.log("✅ Order created after successful payment:", newOrder.orderId);

    res.json({ 
      success: true, 
      orderId: newOrder.orderId,
      paymentId: razorpay_payment_id,
      message: "Payment verified and order created successfully"
    });

  } catch (err) {
    console.error("❌ Payment verification error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Check payment status (for frontend polling if needed)
app.get("/payment-status/:tempOrderId", async (req, res) => {
  try {
    const { tempOrderId } = req.params;
    const tempOrder = pendingOrders.get(tempOrderId);
    
    if (!tempOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ 
      exists: true, 
      status: tempOrder.status,
      createdAt: tempOrder.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// Order Management Routes (AFTER payment)
// ----------------------

// ✅ Upload file route (must happen before payment initiation)
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Queue for admin
app.get("/queue", async (req, res) => {
  try {
    const queue = await ordersCollection.find({ status: { $ne: "Completed" } }).toArray();
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get user's orders (only paid orders from MongoDB)
app.get("/orders/:userId", async (req, res) => {
  try {
    console.log("🔎 Fetching orders for user:", req.params.userId);
    const orders = await ordersCollection.find({ 
      userId: req.params.userId,
      paymentStatus: "completed" 
    }).toArray();
    
    console.log("📦 Found orders:", orders.length);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update order status
app.put("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const result = await ordersCollection.updateOne(
      { orderId },
      { $set: { status, updatedAt: new Date() } }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({ success: true, message: "Order updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status by orderId
app.patch("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // Find and update by orderId
    const result = await ordersCollection.findOneAndUpdate(
      { orderId: id },
      { $set: { status: status } },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({
      message: "✅ Order status updated successfully",
      order: result.value, // Make sure this returns the updated order
    });
  } catch (err) {
    console.error("❌ Error updating order:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get single order by ID
app.get("/order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await ordersCollection.findOne({ orderId });
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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
      
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 }); // 60 second timeout
      
      if (stdout) console.log("✅ LibreOffice stdout:", stdout);
      if (stderr) console.log("⚠️ LibreOffice stderr:", stderr);
      
      // Check if conversion was successful
      const baseName = path.basename(inputPath, path.extname(inputPath));
      const expectedOutput = path.join(convertedDir, `${baseName}.pdf`);
      
      if (fs.existsSync(expectedOutput)) {
        // Rename to our desired output filename
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
  
// Add a simple test endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "QuickPrint Server is running!",
    timestamp: new Date().toISOString(),
    endpoints: {
      convert: "POST /convert",
      upload: "POST /upload",
      initiateOrder: "POST /initiate-order"
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