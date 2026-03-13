const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const pdf = require("pdf-parse");

async function convertFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No file uploaded" 
      });
    }

    const inputPath = req.file.path;
    const originalName = req.file.originalname;
    let pageCount = 0;
    let outputPath = inputPath;
    let converted = false;

    const ext = path.extname(originalName).toLowerCase();
    
    // Count pages based on file type
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(inputPath);
      const pdfData = await pdf(dataBuffer);
      pageCount = pdfData.numpages;
      console.log(`📄 PDF has ${pageCount} pages`);
    } 
    else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      pageCount = 1; // Images are single page
      
      // Convert image to PDF for consistency
      const outputFileName = `converted-${Date.now()}.pdf`;
      outputPath = path.join("uploads", outputFileName);
      
      await sharp(inputPath)
        .pdf()
        .toFile(outputPath);
      
      converted = true;
      console.log(`🖼️ Image converted to PDF: ${outputFileName}`);
    }
    else {
      // For other document types, just count pages approximately
      // In production, you'd use LibreOffice or similar
      pageCount = 1; // Default to 1 page
      console.log(`📄 Document type: ${ext}, defaulting to 1 page`);
    }

    // If we created a new file, don't delete original yet (keep for reference)
    // But if we're using original, keep it too
    const fileUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${path.basename(outputPath)}`;
    
    res.json({ 
      success: true, 
      url: fileUrl,
      pages: pageCount,
      fileName: originalName,
      converted: converted
    });

  } catch (error) {
    console.error("❌ Conversion error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

module.exports = convertFile;