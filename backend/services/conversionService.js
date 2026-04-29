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
  const pdfBuffer = await fsp.readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  return pdfDoc.getPageCount();
}

async function convertFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    const originalPath = path.resolve(req.file.path);
    const originalName = req.file.originalname || req.file.filename;
    const ext = path.extname(originalName).toLowerCase();

    let pageCount = 0;
    let outputPath = originalPath;
    let converted = false;

    if (ext === ".pdf") {
      pageCount = await countPdfPages(originalPath);
    } else {
      if (!NON_PDF_CONVERTIBLE_EXTENSIONS.has(ext)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported file type for PDF conversion: ${ext || "unknown"}`,
        });
      }

      const sourceBuffer = await fsp.readFile(originalPath);
      const sourceFilename = path.basename(originalName || "source");
      const convertedBuffer = await convertWithOptionsAsync(
        sourceBuffer,
        "pdf",
        undefined,
        { fileName: sourceFilename }
      );

      const pdfFilename = `${path.parse(req.file.filename).name}.pdf`;
      outputPath = path.join(uploadsDir, pdfFilename);
      await fsp.writeFile(outputPath, convertedBuffer);
      await fsp.unlink(originalPath).catch(() => {});

      pageCount = await countPdfPages(outputPath);
      converted = true;
    }

    const fileUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${path.basename(outputPath)}`;

    return res.json({
      success: true,
      url: fileUrl,
      pages: pageCount,
      fileName: originalName,
      converted,
    });
  } catch (error) {
    console.error("❌ Conversion error:", error);
    return res.status(500).json({
      success: false,
      error: `Failed to convert file to PDF using libreoffice-convert: ${error.message}`,
    });
  }
}

module.exports = convertFile;
