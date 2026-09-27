// backend/services/documentProcessor.js
const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const libre = require('libreoffice-convert');

class DocumentProcessor {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.processedDir = path.join(__dirname, '../processed');
    this.tempDir = path.join(__dirname, '../temp');

    // Ensure directories exist
    [this.uploadDir, this.processedDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Main processing pipeline
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} Processing result
   */
  async processDocument(file) {
    try {
      console.log(`🔄 Processing file: ${file.originalname}`);

      // Step 1: Validate file
      const validation = await this.validateFile(file);
      if (!validation.valid) {
        throw new Error(`Invalid file: ${validation.error}`);
      }

      // Step 2: Convert to PDF if needed
      const pdfPath = await this.convertToPDF(file);

      // Step 3: Count pages
      const pageCount = await this.countPages(pdfPath);

      // Step 4: Generate thumbnail/preview
      const thumbnailPath = await this.generateThumbnail(pdfPath, file.filename);

      // Step 5: Optimize file size
      const optimizedPath = await this.optimizeFile(pdfPath, file.filename);

      // Step 6: Generate metadata
      const metadata = await this.extractMetadata(pdfPath);
      const publicBaseUrl = (
        process.env.PUBLIC_API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`
      ).replace(/\/$/, '');

      return {
        success: true,
        originalName: file.originalname,
        filename: file.filename,
        fileUrl: `${publicBaseUrl}/uploads/${file.filename}`,
        processedUrl: `${publicBaseUrl}/processed/${path.basename(optimizedPath)}`,
        thumbnailUrl: thumbnailPath ? `${publicBaseUrl}/processed/${path.basename(thumbnailPath)}` : null,
        pageCount,
        fileSize: fs.statSync(optimizedPath).size,
        metadata,
        mimeType: file.mimetype,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Document processing failed:', error);
      throw error;
    }
  }

  /**
   * Validate uploaded file
   */
  async validateFile(file) {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'text/plain'
    ];

    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Unsupported file type' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large (max 50MB)' };
    }

    // Additional security check - verify file extension matches mime type
    const ext = path.extname(file.originalname).toLowerCase();
    const expectedExt = this.getExtensionFromMimeType(file.mimetype);

    if (ext !== expectedExt && !(file.mimetype === 'image/jpeg' && ext === '.jpeg')) {
      return { valid: false, error: 'File extension does not match content type' };
    }

    return { valid: true };
  }

  /**
   * Convert various formats to PDF
   */
  async convertToPDF(file) {
    const inputPath = file.path;
    const outputPath = path.join(this.processedDir, `${file.filename}.pdf`);

    // If already PDF, just copy
    if (file.mimetype === 'application/pdf') {
      await fs.copy(inputPath, outputPath);
      return outputPath;
    }

    // Handle images
    if (file.mimetype.startsWith('image/')) {
      return await this.convertImageToPDF(inputPath, outputPath);
    }

    // Handle documents (Word, etc.)
    if (file.mimetype.includes('word') || file.mimetype === 'text/plain') {
      return await this.convertDocumentToPDF(inputPath, outputPath);
    }

    throw new Error('Unsupported conversion format');
  }

  /**
   * Convert image to PDF
   */
  async convertImageToPDF(inputPath, outputPath) {
    try {
      const imageBuffer = await sharp(inputPath)
        .jpeg({ quality: 90 }) // Optimize image
        .toBuffer();

      const pdfDoc = await PDFDocument.create();
      const image = await pdfDoc.embedJpg(imageBuffer);
      const page = pdfDoc.addPage();
      const margin = 24;
      const scale = Math.min(
        (page.getWidth() - margin * 2) / image.width,
        (page.getHeight() - margin * 2) / image.height
      );
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(image, {
        x: (page.getWidth() - width) / 2,
        y: (page.getHeight() - height) / 2,
        width,
        height,
      });

      const pdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, pdfBytes);

      return outputPath;
    } catch (error) {
      console.error('Image to PDF conversion failed:', error);
      throw new Error('Failed to convert image to PDF');
    }
  }

  /**
   * Convert document to PDF using LibreOffice
   */
  async convertDocumentToPDF(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(outputPath);
      const outputFileName = path.basename(outputPath);

      libre.convert(inputPath, outputFileName, { outputDir }, (err, result) => {
        if (err) {
          console.error('LibreOffice conversion failed:', err);
          reject(new Error('Document conversion failed'));
          return;
        }
        resolve(outputPath);
      });
    });
  }

  /**
   * Count pages in PDF
   */
  async countPages(pdfPath) {
    try {
      const dataBuffer = await fs.readFile(pdfPath);
      const data = await pdfParse(dataBuffer);
      return data.numpages;
    } catch (error) {
      console.error('Page counting failed:', error);
      // Fallback: try to count pages using pdf-lib
      try {
        const pdfBytes = await fs.readFile(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        return pdfDoc.getPageCount();
      } catch (fallbackError) {
        console.error('Fallback page counting also failed:', fallbackError);
        throw new Error('Unable to count pages');
      }
    }
  }

  /**
   * Generate thumbnail/preview image
   */
  async generateThumbnail(pdfPath, filename) {
    return null;
  }

  /**
   * Optimize file size
   */
  async optimizeFile(pdfPath, filename) {
    try {
      const optimizedPath = path.join(this.processedDir, `${filename}_optimized.pdf`);

      const input = await fs.readFile(pdfPath);
      const pdf = await PDFDocument.load(input);
      const output = await pdf.save({ useObjectStreams: true });
      await fs.writeFile(optimizedPath, output);

      return optimizedPath;
    } catch (error) {
      console.warn('File optimization failed:', error);
      return pdfPath; // Return original if optimization fails
    }
  }

  /**
   * Extract document metadata
   */
  async extractMetadata(pdfPath) {
    try {
      const dataBuffer = await fs.readFile(pdfPath);
      const data = await pdfParse(dataBuffer);

      return {
        title: data.info?.Title || '',
        author: data.info?.Author || '',
        subject: data.info?.Subject || '',
        creator: data.info?.Creator || '',
        producer: data.info?.Producer || '',
        creationDate: data.info?.CreationDate || null,
        modificationDate: data.info?.ModDate || null,
        pages: data.numpages,
        text: data.text?.substring(0, 1000) || '', // First 1000 chars for preview
      };
    } catch (error) {
      console.warn('Metadata extraction failed:', error);
      return {};
    }
  }

  /**
   * Utility: Get file extension from mime type
   */
  getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'text/plain': '.txt'
    };
    return mimeToExt[mimeType] || '';
  }

  /**
   * Clean up temporary files
   */
  async cleanup(filename) {
    try {
      const patterns = [
        path.join(this.uploadDir, filename),
        path.join(this.tempDir, `${filename}*`),
        path.join(this.processedDir, `${filename}*`)
      ];

      for (const pattern of patterns) {
        const files = await fs.readdir(path.dirname(pattern));
        const baseName = path.basename(pattern).replace('*', '');

        for (const file of files) {
          if (file.startsWith(baseName)) {
            await fs.remove(path.join(path.dirname(pattern), file));
          }
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
}

module.exports = new DocumentProcessor();