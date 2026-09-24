const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const { promisify } = require("util");
const libre = require("libreoffice-convert");
const { PDFDocument } = require("pdf-lib");

const uploadsDir = path.resolve(__dirname, "../uploads");
const convertWithOptionsAsync = promisify(libre.convertWithOptions);
const NON_PDF_CONVERTIBLE_EXTENSIONS = new Set([
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
]);

async function countPdfPages(pdfPath) {
  try {
    const pdfBuffer = await fsp.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
  } catch (err) {
    console.error("⚠️ PDF page counting error:", err.message);
    return 1; // Fallback to 1 page if parsing fails
  }
}

async function processSingleFile(file) {
  const originalPath = path.resolve(file.path);
  const originalName = file.originalname || file.filename;
  const ext = path.extname(originalName).toLowerCase();

  let pageCount = 1;
  let outputPath = originalPath;
  let converted = false;

  if (ext === ".pdf") {
    pageCount = await countPdfPages(originalPath);
  } else if (NON_PDF_CONVERTIBLE_EXTENSIONS.has(ext)) {
    try {
      const sourceBuffer = await fsp.readFile(originalPath);
      const sourceFilename = path.basename(originalName || "source");
      const convertedBuffer = await convertWithOptionsAsync(
        sourceBuffer,
        "pdf",
        undefined,
        { fileName: sourceFilename }
      );

      const pdfFilename = `${path.parse(file.filename).name}.pdf`;
      outputPath = path.join(uploadsDir, pdfFilename);
      await fsp.writeFile(outputPath, convertedBuffer);
      await fsp.unlink(originalPath).catch(() => {});

      pageCount = await countPdfPages(outputPath);
      converted = true;
    } catch (err) {
      console.warn("⚠️ Office/Image PDF conversion fallback:", err.message);
      // If conversion fails, keep original file and treat as 1 page
      pageCount = 1;
    }
  }

  const port = process.env.PORT || 5000;
  const fileUrl = `http://localhost:${port}/uploads/${path.basename(outputPath)}`;

  return {
    name: originalName,
    originalName: originalName,
    url: fileUrl,
    pageCount: pageCount,
    size: file.size,
    mimeType: file.mimetype,
    converted,
  };
}

async function convertFile(req, res) {
  try {
    const filesToProcess = req.files && req.files.length > 0 
      ? req.files 
      : (req.file ? [req.file] : []);

    if (filesToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const processedFiles = [];
    let totalCombinedPages = 0;

    for (const file of filesToProcess) {
      const result = await processSingleFile(file);
      processedFiles.push(result);
      totalCombinedPages += result.pageCount;
    }

    // For single file backward compatibility
    const primaryResult = processedFiles[0];

    return res.json({
      success: true,
      url: primaryResult.url,
      pages: totalCombinedPages,
      fileCount: processedFiles.length,
      files: processedFiles,
      fileName: primaryResult.originalName,
      converted: primaryResult.converted,
    });
  } catch (error) {
    console.error("❌ Conversion error:", error);
    return res.status(500).json({
      success: false,
      error: `Failed to convert file(s): ${error.message}`,
    });
  }
}

module.exports = convertFile;

