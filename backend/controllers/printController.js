const { getCollections } = require('../config/database');
const { getPrinters, validatePrinter, downloadFileForPrinting, calculatePrintTime } = require('../services/printerService');

const getPrintersList = (req, res) => {
  try {
    res.json({ success: true, printers: getPrinters() });
  } catch (err) {
    console.error("❌ Error fetching printers:", err);
    res.status(500).json({ error: "Failed to fetch printers" });
  }
};

const executePrint = async (req, res) => {
  try {
    const { orderId, printerId, fileUrl, printConfig } = req.body;

    if (!orderId || !printerId || !fileUrl) {
      return res.status(400).json({ success: false, error: "Missing required print parameters" });
    }

    const validation = validatePrinter(printerId, printConfig);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const { ordersCollection } = getCollections();
    const order = await ordersCollection.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const fileBuffer = await downloadFileForPrinting(fileUrl);
    
    const totalPages = printConfig.copies * (order.totalPages || order.pageCount);
    const estimatedTimeSeconds = calculatePrintTime(validation.printer, totalPages);

    await new Promise(resolve => setTimeout(resolve, 3000));

    if (order.status === "Queued") {
      await ordersCollection.updateOne(
        { orderId },
        { 
          $set: { 
            status: "In Progress",
            printerUsed: validation.printer.name,
            printStartedAt: new Date(),
            printConfig
          } 
        }
      );
    } else {
      await ordersCollection.updateOne(
        { orderId },
        { 
          $push: {
            printHistory: {
              printedAt: new Date(),
              printer: validation.printer.name,
              config: printConfig
            }
          }
        }
      );
    }

    res.json({
      success: true,
      message: "Print job sent successfully",
      orderId,
      printer: validation.printer.name,
      printConfig,
      totalPages,
      estimatedTime: estimatedTimeSeconds,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Print error:", err);
    res.status(500).json({ success: false, error: "Print failed: " + err.message });
  }
};

module.exports = {
  getPrintersList,
  executePrint
};