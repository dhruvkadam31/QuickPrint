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
   * @param {Object} options - Optional validation options
   * @returns {Promise<Object>} Processing result
   */
  async processDocument(file, options = {}) {
    const documentValidator = require('./documentValidator');
    try {
      console.log(`🔄 Processing file: ${file.originalname}`);

      // Step 1: Validate file using Smart Document Validator
      const validation = await documentValidator.validateDocument(file, options);
      const publicBaseUrl = (
        process.env.PUBLIC_API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`
      ).replace(/\/$/, '');

      // If document validation critically failed, return structured failure report
      if (validation.overallStatus === 'FAILED') {
        return {
          success: false,
          originalName: file.originalname,
          filename: file.filename,
          fileUrl: `${publicBaseUrl}/uploads/${file.filename}`,
          processedUrl: null,
          thumbnailUrl: null,
          pageCount: 0,
          fileSize: file.size || 0,
          metadata: {},
          mimeType: file.mimetype,
          validation,
          error: validation.errors[0] || 'Document validation failed'
        };
      }

      // Step 2: Convert to PDF if needed
      let pdfPath = null;
      try {
        pdfPath = await this.convertToPDF(file);
      } catch (convErr) {
        console.warn('Conversion warning/fallback:', convErr.message);
        pdfPath = file.path;
      }

      // Step 3: Count pages (use validated page count if available)
      let pageCount = validation.detectedPageCount;
      if (pageCount === null || pageCount === undefined) {
        try {
          pageCount = await this.countPages(pdfPath);
        } catch {
          pageCount = 1;
        }
      }

      // Step 4: Generate thumbnail/preview for images
      let thumbnailPath = null;
      try {
        thumbnailPath = await this.generateThumbnail(pdfPath, file.filename, file);
      } catch (thumbErr) {
        console.warn('Thumbnail generation note:', thumbErr.message);
      }

      // Step 5: Optimize file size if PDF
      let optimizedPath = pdfPath;
      if (pdfPath && pdfPath.endsWith('.pdf')) {
        optimizedPath = await this.optimizeFile(pdfPath, file.filename);
      }

      // Step 6: Generate metadata
      const metadata = pdfPath && pdfPath.endsWith('.pdf') ? await this.extractMetadata(pdfPath) : {};

      const fileSize = (await fs.pathExists(optimizedPath))
        ? (await fs.stat(optimizedPath)).size
        : (file.size || 0);

      return {
        success: true,
        originalName: file.originalname,
        filename: file.filename,
        fileUrl: `${publicBaseUrl}/uploads/${file.filename}`,
        processedUrl: (await fs.pathExists(optimizedPath))
          ? `${publicBaseUrl}/processed/${path.basename(optimizedPath)}`
          : `${publicBaseUrl}/uploads/${file.filename}`,
        thumbnailUrl: thumbnailPath ? `${publicBaseUrl}/processed/${path.basename(thumbnailPath)}` : null,
        pageCount: pageCount || 1,
        fileSize,
        metadata,
        mimeType: file.mimetype,
        validation,
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
  async generateThumbnail(pdfPath, filename, file) {
    try {
      const ext = path.extname(file?.originalname || filename || '').toLowerCase();
      const thumbFilename = `${filename}_thumb.jpg`;
      const thumbPath = path.join(this.processedDir, thumbFilename);

      if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'].includes(ext) && file?.path) {
        await sharp(file.path)
          .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(thumbPath);
        return thumbPath;
      }
      return null;
    } catch (err) {
      console.warn('Thumbnail generation skipped:', err.message);
      return null;
    }
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
      let title = '', author = '', subject = '', creator = '', producer = '', creationDate = null, pages = 1;
      try {
        const pdfDoc = await PDFDocument.load(dataBuffer, { ignoreEncryption: true });
        title = pdfDoc.getTitle() || '';
        author = pdfDoc.getAuthor() || '';
        subject = pdfDoc.getSubject() || '';
        creator = pdfDoc.getCreator() || '';
        producer = pdfDoc.getProducer() || '';
        creationDate = pdfDoc.getCreationDate() || null;
        pages = pdfDoc.getPageCount();
      } catch (e) {
        try {
          const data = await pdfParse(dataBuffer);
          title = data.info?.Title || '';
          author = data.info?.Author || '';
          subject = data.info?.Subject || '';
          creator = data.info?.Creator || '';
          producer = data.info?.Producer || '';
          creationDate = data.info?.CreationDate || null;
          pages = data.numpages || 1;
        } catch {}
      }

      return {
        title,
        author,
        subject,
        creator,
        producer,
        creationDate,
        pages,
      };
    } catch (error) {
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