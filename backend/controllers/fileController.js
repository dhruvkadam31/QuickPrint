const fs = require("fs");
const path = require("path");
const { countPDFPages, convertImageToPDF, convertWithLibreOffice } = require('../services/conversionService');

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const convertFile = async (req, res) => {
  console.log("🔄 /convert endpoint hit at:", new Date().toISOString());
  
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const inputPath = file.path;
    const convertedDir = path.join(__dirname, "../converted");
    
    if (!fs.existsSync(convertedDir)) {
      fs.mkdirSync(convertedDir, { recursive: true });
    }

    const outputFileName = `${Date.now()}.pdf`;
    const outputPath = path.join(convertedDir, outputFileName);

    let pageCount = 1;
    let conversionNote = "";

    // Image files
    if ([".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".gif"].includes(ext)) {
      const result = await convertImageToPDF(inputPath, outputPath);
      
      if (!result.success) {
        try {
          await convertWithLibreOffice(inputPath, outputPath);
          conversionNote = "Converted with LibreOffice (fallback)";
        } catch (libreError) {
          fs.copyFileSync(inputPath, outputPath);
          conversionNote = "Original file copied (conversion failed)";
        }
      } else {
        conversionNote = "Converted with Sharp";
      }
      pageCount = 1;
    }
    // Document files
    else if ([
      ".doc", ".docx", ".dot", ".dotx", ".docm", ".odt",
      ".ppt", ".pptx", ".pot", ".potx", ".pps", ".ppsx", ".pptm", ".odp",
      ".xls", ".xlsx", ".xlt", ".xltx", ".xlsm", ".ods",
      ".rtf", ".txt", ".html", ".htm"
    ].includes(ext)) {
      try {
        await convertWithLibreOffice(inputPath, outputPath);
        conversionNote = "Converted with LibreOffice";
      } catch (libreError) {
        fs.copyFileSync(inputPath, outputPath);
        conversionNote = "Original file copied (conversion failed)";
        return res.json({
          success: true,
          pages: pageCount,
          url: `http://localhost:5000/files/${outputFileName}`,
          note: conversionNote
        });
      }
    }
    // PDF files
    else if (ext === ".pdf") {
      fs.copyFileSync(inputPath, outputPath);
      conversionNote = "PDF copied directly";
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // Count pages
    if (fs.existsSync(outputPath)) {
      pageCount = await countPDFPages(outputPath);
    }

    const fileUrl = `http://localhost:5000/files/${outputFileName}`;

    res.json({
      success: true,
      pages: pageCount,
      url: fileUrl,
      note: conversionNote
    });
  } catch (err) {
    console.error("❌ Conversion error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Conversion failed", 
      details: err?.message || String(err) 
    });
  }
};

module.exports = {
  uploadFile,
  convertFile
};