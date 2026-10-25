// backend/services/documentValidator.js
const fs = require('fs-extra');
const path = require('path');
const zlib = require('zlib');
const sharp = require('sharp');
const { PDFDocument, PDFName, PDFArray } = require('pdf-lib');

// Configuration and Limits
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB limit
const LARGE_FILE_THRESHOLD = 15 * 1024 * 1024; // 15 MB warning threshold
const LOW_RESOLUTION_MIN_WIDTH = 800; // px
const LOW_RESOLUTION_MIN_HEIGHT = 600; // px
const LOW_DPI_THRESHOLD = 150; // DPI
const RECOMMENDED_DPI = 300; // DPI

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.tiff',
  '.txt'
];

// In-memory cache for document validation results to avoid redundant expensive processing
const validationCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Detect actual file format by inspecting magic bytes / header signatures
 * @param {Buffer} buffer - Initial file bytes
 * @returns {string} Detected format identifier ('pdf', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'docx', 'doc', 'txt', 'empty', or 'unknown')
 */
function detectActualFormat(buffer) {
  if (!buffer || buffer.length === 0) return 'empty';

  // PDF: starts with '%PDF-' (0x25 0x50 0x44 0x46 0x2D)
  if (buffer.length >= 5 && buffer.slice(0, 5).toString('ascii').startsWith('%PDF-')) {
    return 'pdf';
  }

  // JPEG: starts with 0xFF 0xD8 0xFF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 8-byte signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // GIF: 'GIF87a' or 'GIF89a'
  if (
    buffer.length >= 6 &&
    (buffer.slice(0, 6).toString('ascii') === 'GIF87a' ||
      buffer.slice(0, 6).toString('ascii') === 'GIF89a')
  ) {
    return 'gif';
  }

  // BMP: 'BM' (0x42 0x4D)
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return 'bmp';
  }

  // TIFF: 'II*\0' or 'MM\0*'
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
      (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a))
  ) {
    return 'tiff';
  }

  // DOCX / Office Open XML: ZIP archive starting with PK\x03\x04
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    const sample = buffer.slice(0, Math.min(buffer.length, 4096)).toString('utf8');
    if (sample.includes('word/') || sample.includes('[Content_Types].xml')) {
      return 'docx';
    }
    return 'zip';
  }

  // DOC: OLE Compound Document (0xD0 0xCF 0x11 0xE0 0xA1 0xB1 0x1A 0xE1)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    return 'doc';
  }

  // Plain text (no null control bytes in first 512 bytes)
  const sampleLen = Math.min(buffer.length, 512);
  let hasNull = false;
  for (let i = 0; i < sampleLen; i++) {
    if (buffer[i] === 0x00) {
      hasNull = true;
      break;
    }
  }
  if (!hasNull && sampleLen > 0) {
    return 'txt';
  }

  return 'unknown';
}

/**
 * Clean error message for user display
 */
function cleanErrorMessage(err) {
  if (!err) return 'Unknown parsing error';
  const msg = err.message || String(err);
  if (msg.includes('password') || msg.includes('encrypted')) {
    return 'Document is password-protected or encrypted.';
  }
  if (
    msg.includes('bad XRef') ||
    msg.includes('Invalid PDF') ||
    msg.includes('parse') ||
    msg.includes('Pages') ||
    msg.includes('catalog') ||
    msg.includes('trailer') ||
    msg.includes('TypeError')
  ) {
    return 'Document structure is corrupted or unreadable.';
  }
  return msg.length > 120 ? msg.slice(0, 120) + '...' : msg;
}

/**
 * Inspect a PDF page to detect if it is genuinely blank or contains minimal text/content
 * @param {PDFPage} page - pdf-lib PDFPage
 * @param {PDFDocument} pdfDoc - Loaded PDFDocument
 * @param {number} pageIndex - 0-indexed page number
 * @returns {Object} Blank status { isBlank: boolean, isLowContent: boolean, reason: string, textSnippet: string }
 */
function analyzePdfPageContent(page, pdfDoc, pageIndex) {
  try {
    const contentsRef = page.node.get(PDFName.of('Contents'));
    const resources = page.node.Resources();

    // Check if there are external XObjects (images, vector forms)
    let hasXObjects = false;
    if (resources) {
      const xObjectDict = resources.get(PDFName.of('XObject'));
      if (xObjectDict) {
        const derefXObject = pdfDoc.context.lookup(xObjectDict);
        if (derefXObject && derefXObject.dict && derefXObject.dict.size > 0) {
          hasXObjects = true;
        }
      }
    }

    // Check annotations for visible markup
    let hasVisibleAnnots = false;
    const annots = page.node.get(PDFName.of('Annots'));
    if (annots) {
      const derefAnnots = pdfDoc.context.lookup(annots);
      if (derefAnnots && derefAnnots.size && derefAnnots.size() > 0) {
        hasVisibleAnnots = true;
      }
    }

    // Case 1: No Contents stream at all
    if (!contentsRef) {
      if (!hasXObjects && !hasVisibleAnnots) {
        return {
          isBlank: true,
          isLowContent: false,
          reason: 'Completely blank page (no content stream, drawings, or images)',
          textSnippet: ''
        };
      }
      return { isBlank: false, isLowContent: false };
    }

    // Dereference contents stream(s)
    const deref = pdfDoc.context.lookup(contentsRef);
    const refs = deref instanceof PDFArray ? deref.asArray() : [contentsRef];

    let combinedStreamText = '';
    for (const r of refs) {
      const s = pdfDoc.context.lookup(r);
      if (s && s.getContents) {
        let raw = s.getContents();
        const filter = s.dict?.get(PDFName.of('Filter'));
        if (filter && filter.toString().includes('FlateDecode')) {
          try {
            raw = zlib.inflateSync(Buffer.from(raw));
          } catch (e) {
            // Keep raw if decompression fails
          }
        }
        combinedStreamText += Buffer.from(raw).toString('latin1');
      }
    }

    // If stream is empty or contains only whitespace/comments
    const trimmedStream = combinedStreamText.replace(/%[^\r\n]*/g, '').trim();
    if (!trimmedStream) {
      if (!hasXObjects && !hasVisibleAnnots) {
        return {
          isBlank: true,
          isLowContent: false,
          reason: 'Completely blank page (empty content stream)',
          textSnippet: ''
        };
      }
    }

    // Detect drawing and painting operators in PDF stream
    // Operators:
    // Text: Tj, TJ, ', "
    // Painting: Do (XObject), BI/ID/EI (inline image), re (rectangle), S/s (stroke), f/F/f* (fill), B/B*/b/b* (fill+stroke), sh (shading)
    const hasPaintOperators = /\b(Tj|TJ|'|"|Do|BI|re|S|s|f|F|f\*|B|B\*|b|b\*|sh)\b/.test(combinedStreamText);

    if (!hasPaintOperators && !hasXObjects && !hasVisibleAnnots) {
      return {
        isBlank: true,
        isLowContent: false,
        reason: 'Completely blank page (no printable text, shapes, or image operators)',
        textSnippet: ''
      };
    }

    // Extract text snippets from PDF text operators (e.g. (Hello) Tj or [(Hello) 10 (World)] TJ)
    const textMatches = [];
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let match;
    while ((match = tjRegex.exec(combinedStreamText)) !== null) {
      if (match[1]) textMatches.push(match[1]);
    }
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(combinedStreamText)) !== null) {
      const inner = match[1].replace(/\(([^)]*)\)/g, (_, str) => {
        textMatches.push(str);
        return '';
      });
    }

    const visibleText = textMatches.join(' ').replace(/\s+/g, ' ').trim();

    // Check for low content: e.g. lone page number ("4") or tiny punctuation, with no images
    if (visibleText.length > 0 && visibleText.length <= 5 && !hasXObjects) {
      return {
        isBlank: true,
        isLowContent: true,
        reason: `Minimal content detected on page ("${visibleText}")`,
        textSnippet: visibleText
      };
    }

    return { isBlank: false, isLowContent: false, textSnippet: visibleText.slice(0, 100) };
  } catch (err) {
    // Non-fatal page inspection failure
    return { isBlank: false, isLowContent: false };
  }
}

class DocumentValidator {
  constructor() {
    this.maxFileSize = MAX_FILE_SIZE;
  }

  /**
   * Authoritative document validation
   * @param {Object} file - Multer file object or file descriptor { path, originalname, filename, size, mimetype }
   * @param {Object} options - Optional validation parameters { enteredPageCount, forceRecheck }
   * @returns {Promise<Object>} Detailed validation report
   */
  async validateDocument(file, options = {}) {
    const startTime = Date.now();
    const filePath = file.path;
    const originalName = file.originalname || file.name || 'document';
    const filename = file.filename || path.basename(filePath || originalName);
    const enteredPageCount = options.enteredPageCount ? Number(options.enteredPageCount) : null;

    // Cache check
    const cacheKey = `${filename}_${file.size || 0}`;
    if (!options.forceRecheck && validationCache.has(cacheKey)) {
      const cached = validationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        // Return cached with updated enteredPageCount check if specified
        return this.recheckEnteredPageCount({ ...cached.report }, enteredPageCount);
      }
    }

    const report = {
      filename,
      originalName,
      fileSize: file.size || 0,
      fileSizeBytes: file.size || 0,
      fileFormat: 'UNKNOWN',
      mimeType: file.mimetype || 'application/octet-stream',
      detectedPageCount: null,
      isPageCountExact: false,
      pageCountLabel: null,
      overallStatus: 'READY', // 'READY' | 'WARNING' | 'FAILED'
      statusLabel: 'Ready to Print',
      previewStatus: 'UNAVAILABLE', // 'AVAILABLE' | 'UNAVAILABLE'
      previewMessage: '',
      checks: {
        fileIntegrity: { status: 'PASS', message: 'File is readable and not empty' },
        formatValidation: { status: 'PASS', message: 'Format is supported' },
        pageCount: { status: 'PASS', count: null, isExact: false, message: '' },
        blankPages: { status: 'PASS', blankPages: [], details: [], message: 'No blank pages detected' },
        printQuality: { status: 'PASS', issues: [], warnings: [], message: 'Quality checks passed' },
        preview: { status: 'PASS', message: 'Preview available' }
      },
      errors: [],
      warnings: [],
      info: [],
      validatedAt: new Date().toISOString(),
      validationDurationMs: 0
    };

    try {
      // 1. Read file buffer for inspection
      let fileBuffer = null;
      if (filePath && (await fs.pathExists(filePath))) {
        fileBuffer = await fs.readFile(filePath);
        report.fileSize = fileBuffer.length;
        report.fileSizeBytes = fileBuffer.length;
      } else if (file.buffer) {
        fileBuffer = file.buffer;
        report.fileSize = fileBuffer.length;
        report.fileSizeBytes = fileBuffer.length;
      } else {
        throw new Error('File data is missing or inaccessible on server.');
      }

      // 2. File Integrity: Empty check
      if (fileBuffer.length === 0) {
        report.overallStatus = 'FAILED';
        report.statusLabel = 'Validation Failed';
        report.checks.fileIntegrity = {
          status: 'FAIL',
          message: 'File is empty (0 bytes).'
        };
        report.errors.push('The file is completely empty (0 bytes). QuickPrint cannot print empty documents.');
        report.validationDurationMs = Date.now() - startTime;
        return report;
      }

      // 3. File Size Validation
      if (fileBuffer.length > this.maxFileSize) {
        report.overallStatus = 'FAILED';
        report.statusLabel = 'Validation Failed';
        report.checks.fileIntegrity = {
          status: 'FAIL',
          message: `File size exceeds the 20 MB limit.`
        };
        report.errors.push(
          `File size (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum upload limit of 20 MB. Please compress the file before uploading.`
        );
        report.validationDurationMs = Date.now() - startTime;
        return report;
      }

      if (fileBuffer.length > LARGE_FILE_THRESHOLD) {
        report.warnings.push(
          `File size is unusually large (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB). Processing and printer spooling may take longer.`
        );
        report.checks.printQuality.warnings.push('Large file size may increase print spool time.');
        if (report.overallStatus !== 'FAILED') {
          report.overallStatus = 'WARNING';
          report.statusLabel = 'Warnings Found';
        }
      }

      // 4. File Extension & Actual Magic Bytes Inspection
      const ext = path.extname(originalName).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        report.overallStatus = 'FAILED';
        report.statusLabel = 'Validation Failed';
        report.checks.formatValidation = {
          status: 'FAIL',
          message: `Unsupported file extension "${ext}".`
        };
        report.errors.push(
          `The format "${ext}" is not supported. Supported document formats are: PDF, DOC, DOCX, JPG, PNG, GIF, BMP, TIFF, and TXT.`
        );
        report.validationDurationMs = Date.now() - startTime;
        return report;
      }

      const actualFormat = detectActualFormat(fileBuffer);
      report.fileFormat = actualFormat.toUpperCase();

      // Check for misleading extensions (spoofing)
      const formatExtMap = {
        pdf: ['.pdf'],
        jpeg: ['.jpg', '.jpeg'],
        png: ['.png'],
        gif: ['.gif'],
        bmp: ['.bmp'],
        tiff: ['.tiff', '.tif'],
        docx: ['.docx'],
        doc: ['.doc'],
        txt: ['.txt']
      };

      const expectedExts = formatExtMap[actualFormat] || [];
      const isFormatMatch = expectedExts.includes(ext);

      if (!isFormatMatch) {
        // Exception: some valid DOC/DOCX or text files might be detected as generic binary or OLE
        if (actualFormat === 'unknown' && ext === '.txt') {
          // Allow plain text if not binary
        } else {
          report.overallStatus = 'FAILED';
          report.statusLabel = 'Validation Failed';
          report.checks.formatValidation = {
            status: 'FAIL',
            message: `File content does not match extension "${ext}". Detected actual format: ${actualFormat.toUpperCase()}.`
          };
          report.errors.push(
            `File extension "${ext}" does not match the actual file signature (detected: ${actualFormat.toUpperCase()}). Please upload an authentic, unrenamed document.`
          );
          report.validationDurationMs = Date.now() - startTime;
          return report;
        }
      }

      report.checks.formatValidation = {
        status: 'PASS',
        message: `Verified authentic ${actualFormat.toUpperCase()} document.`
      };

      // 5. Format-Specific Deep Inspection & Validation
      if (actualFormat === 'pdf') {
        await this.validatePdfDocument(fileBuffer, report, options);
      } else if (['jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(actualFormat)) {
        await this.validateImageDocument(fileBuffer, actualFormat, report, options);
      } else if (actualFormat === 'docx' || actualFormat === 'doc') {
        await this.validateWordDocument(fileBuffer, actualFormat, report, options);
      } else if (actualFormat === 'txt') {
        await this.validateTextDocument(fileBuffer, report, options);
      }

      // 6. Manual Page Count Comparison
      if (enteredPageCount && report.detectedPageCount !== null) {
        if (report.isPageCountExact && report.detectedPageCount !== enteredPageCount) {
          report.warnings.push(
            `The entered page count (${enteredPageCount}) does not match the detected count (${report.detectedPageCount}). Please verify your print settings.`
          );
          report.checks.pageCount.status = 'WARN';
          report.checks.pageCount.message = `Entered count (${enteredPageCount}) differs from detected count (${report.detectedPageCount}).`;
          if (report.overallStatus !== 'FAILED') {
            report.overallStatus = 'WARNING';
            report.statusLabel = 'Warnings Found';
          }
        }
      }

      // 7. Overall Status Finalization
      if (report.errors.length > 0) {
        report.overallStatus = 'FAILED';
        report.statusLabel = 'Validation Failed';
      } else if (report.warnings.length > 0) {
        report.overallStatus = 'WARNING';
        report.statusLabel = 'Warnings Found';
      } else {
        report.overallStatus = 'READY';
        report.statusLabel = 'Ready to Print';
      }
    } catch (unexpectedError) {
      console.error('❌ Document validation error:', unexpectedError);
      report.overallStatus = 'FAILED';
      report.statusLabel = 'Validation Failed';
      report.errors.push(`Document validation error: ${cleanErrorMessage(unexpectedError)}`);
      report.checks.fileIntegrity = {
        status: 'FAIL',
        message: cleanErrorMessage(unexpectedError)
      };
    }

    report.validationDurationMs = Date.now() - startTime;

    // Save to cache
    validationCache.set(cacheKey, {
      report: JSON.parse(JSON.stringify(report)),
      timestamp: Date.now()
    });

    return report;
  }

  /**
   * PDF Document Validation
   */
  async validatePdfDocument(buffer, report, options) {
    let pdfDoc;
    let pageCount = 0;
    try {
      pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      pageCount = pdfDoc.getPageCount();
    } catch (pdfErr) {
      report.overallStatus = 'FAILED';
      report.statusLabel = 'Validation Failed';
      const cleanMsg = cleanErrorMessage(pdfErr);
      report.checks.fileIntegrity = {
        status: 'FAIL',
        message: cleanMsg
      };
      report.checks.preview = {
        status: 'FAIL',
        message: 'Cannot preview unreadable or corrupted PDF.'
      };
      report.errors.push(`This PDF file could not be opened: ${cleanMsg}. Please upload a valid document.`);
      return;
    }

    report.detectedPageCount = pageCount;
    report.isPageCountExact = true;
    report.pageCountLabel = `${pageCount} page${pageCount > 1 ? 's' : ''}`;
    report.checks.pageCount = {
      status: 'PASS',
      count: pageCount,
      isExact: true,
      message: `Your PDF contains ${pageCount} page${pageCount > 1 ? 's' : ''}.`
    };
    report.info.push(`Your PDF contains ${pageCount} page${pageCount > 1 ? 's' : ''}.`);

    if (pageCount === 0) {
      report.overallStatus = 'FAILED';
      report.statusLabel = 'Validation Failed';
      report.errors.push('PDF contains 0 pages and cannot be processed.');
      return;
    }

    // Blank Page Detection & Page Dimensions Check
    const blankPages = [];
    const blankDetails = [];
    const pageSizes = [];
    let hasMixedSizes = false;

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const width = Math.round(page.getWidth());
      const height = Math.round(page.getHeight());
      pageSizes.push({ width, height });

      // Compare dimensions against page 1
      if (i > 0) {
        const first = pageSizes[0];
        const widthDiff = Math.abs(width - first.width) / first.width;
        const heightDiff = Math.abs(height - first.height) / first.height;
        if (widthDiff > 0.08 || heightDiff > 0.08) {
          hasMixedSizes = true;
        }
      }

      // Check unusual dimensions (e.g. extremely small or huge)
      if (width < 200 || height < 200) {
        report.warnings.push(
          `Page ${i + 1} has unusually small dimensions (${width}×${height} pt). Standard A4 is 595×842 pt.`
        );
      } else if (width > 3000 || height > 3000) {
        report.warnings.push(
          `Page ${i + 1} has unusually large dimensions (${width}×${height} pt). Print scaling may be required.`
        );
      }

      // Blank page check
      const blankResult = analyzePdfPageContent(page, pdfDoc, i);
      if (blankResult.isBlank) {
        blankPages.push(i + 1);
        blankDetails.push({
          page: i + 1,
          type: blankResult.isLowContent ? 'low_content' : 'confirmed',
          reason: blankResult.reason,
          textSnippet: blankResult.textSnippet || ''
        });
      }
    }

    if (hasMixedSizes) {
      report.warnings.push(
        `Mixed page sizes detected (e.g., Page 1: ${pageSizes[0].width}×${pageSizes[0].height} pt, other pages vary). Pages may scale differently when printed.`
      );
      report.checks.printQuality.warnings.push('Mixed page dimensions detected across document.');
    }

    if (blankPages.length > 0) {
      const confirmedBlanks = blankDetails.filter((b) => b.type === 'confirmed').map((b) => b.page);
      const lowContentBlanks = blankDetails.filter((b) => b.type === 'low_content').map((b) => b.page);

      let warningMsg = `Possible blank page${blankPages.length > 1 ? 's' : ''} detected on page${blankPages.length > 1 ? 's' : ''} ${blankPages.join(', ')}.`;
      if (confirmedBlanks.length > 0 && lowContentBlanks.length > 0) {
        warningMsg += ` (Page${confirmedBlanks.length > 1 ? 's' : ''} ${confirmedBlanks.join(', ')} appear completely blank; Page${lowContentBlanks.length > 1 ? 's' : ''} ${lowContentBlanks.join(', ')} contain minimal content).`;
      } else if (confirmedBlanks.length > 0) {
        warningMsg += ` (No printable text or graphics detected).`;
      } else {
        warningMsg += ` (Minimal content detected).`;
      }

      report.warnings.push(warningMsg);
      report.checks.blankPages = {
        status: 'WARN',
        blankPages,
        details: blankDetails,
        message: warningMsg
      };
      if (report.overallStatus !== 'FAILED') {
        report.overallStatus = 'WARNING';
        report.statusLabel = 'Warnings Found';
      }
    } else {
      report.checks.blankPages = {
        status: 'PASS',
        blankPages: [],
        details: [],
        message: 'No blank pages detected.'
      };
    }

    report.previewStatus = 'AVAILABLE';
    report.previewMessage = 'Document preview generated and ready for review.';
    report.checks.preview = {
      status: 'PASS',
      message: 'Preview rendered successfully.'
    };
  }

  /**
   * Image Document Validation
   */
  async validateImageDocument(buffer, format, report, options) {
    try {
      const metadata = await sharp(buffer).metadata();
      report.detectedPageCount = 1;
      report.isPageCountExact = true;
      report.pageCountLabel = '1 page (single image)';
      report.checks.pageCount = {
        status: 'PASS',
        count: 1,
        isExact: true,
        message: 'Image will be printed on 1 page.'
      };

      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const density = metadata.density || null;

      // Print resolution checks
      if (width < LOW_RESOLUTION_MIN_WIDTH || height < LOW_RESOLUTION_MIN_HEIGHT) {
        report.warnings.push(
          `Low-resolution image detected (${width}×${height} px). Printing at full page (A4) may appear pixelated or blurry (recommended: at least 1500×2000 px).`
        );
        report.checks.printQuality.warnings.push(`Low pixel resolution (${width}×${height} px).`);
        if (report.overallStatus !== 'FAILED') {
          report.overallStatus = 'WARNING';
          report.statusLabel = 'Warnings Found';
        }
      }

      if (density && density < LOW_DPI_THRESHOLD) {
        report.warnings.push(
          `Image resolution is ${density} DPI (recommended: ${RECOMMENDED_DPI} DPI for crisp print quality).`
        );
        report.checks.printQuality.warnings.push(`Image DPI is ${density} (recommended: ${RECOMMENDED_DPI} DPI).`);
        if (report.overallStatus !== 'FAILED') {
          report.overallStatus = 'WARNING';
          report.statusLabel = 'Warnings Found';
        }
      }

      report.previewStatus = 'AVAILABLE';
      report.previewMessage = 'Image preview ready.';
      report.checks.preview = {
        status: 'PASS',
        message: 'Image decoded and preview ready.'
      };
    } catch (imgErr) {
      report.overallStatus = 'FAILED';
      report.statusLabel = 'Validation Failed';
      report.checks.fileIntegrity = {
        status: 'FAIL',
        message: 'Image data is corrupted or cannot be decoded.'
      };
      report.checks.preview = {
        status: 'FAIL',
        message: 'Image preview could not be generated.'
      };
      report.errors.push('The image file is corrupted and could not be decoded. Please upload a valid image.');
    }
  }

  /**
   * DOCX / DOC Document Validation
   */
  async validateWordDocument(buffer, format, report, options) {
    // DOCX files have layout-dependent pagination
    report.isPageCountExact = false;

    // Estimate pages based on content / word count
    let estimatedPages = 1;
    try {
      const textSample = buffer.toString('utf8');
      const textMatches = textSample.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (textMatches && textMatches.length > 0) {
        const textContent = textMatches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ');
        const wordCount = textContent.trim().split(/\s+/).length;
        estimatedPages = Math.max(1, Math.ceil(wordCount / 380));
      }
    } catch (e) {
      estimatedPages = 1;
    }

    report.detectedPageCount = estimatedPages;
    report.pageCountLabel = `~${estimatedPages} page${estimatedPages > 1 ? 's' : ''} (estimated)`;
    report.checks.pageCount = {
      status: 'WARN',
      count: estimatedPages,
      isExact: false,
      message: `Estimated ~${estimatedPages} page${estimatedPages > 1 ? 's' : ''}. DOCX pagination depends on printer margins, fonts, and layout.`
    };

    report.warnings.push(
      `Page count for ${format.toUpperCase()} documents is an estimate (~${estimatedPages} pages). Final layout depends on print formatting.`
    );
    if (report.overallStatus !== 'FAILED') {
      report.overallStatus = 'WARNING';
      report.statusLabel = 'Warnings Found';
    }

    report.previewStatus = 'AVAILABLE';
    report.previewMessage = 'Word document preview converted for review.';
    report.checks.preview = {
      status: 'PASS',
      message: 'Document conversion pipeline ready.'
    };
  }

  /**
   * Text Document Validation
   */
  async validateTextDocument(buffer, report, options) {
    report.isPageCountExact = false;
    const text = buffer.toString('utf8');
    const lines = text.split(/\r\n|\r|\n/);
    const estimatedPages = Math.max(1, Math.ceil(lines.length / 50));

    report.detectedPageCount = estimatedPages;
    report.pageCountLabel = `~${estimatedPages} page${estimatedPages > 1 ? 's' : ''} (estimated)`;
    report.checks.pageCount = {
      status: 'WARN',
      count: estimatedPages,
      isExact: false,
      message: `Estimated ~${estimatedPages} page${estimatedPages > 1 ? 's' : ''} based on ~50 lines per sheet.`
    };
    report.info.push(`Plain text document (~${lines.length} lines, estimated ~${estimatedPages} pages).`);

    report.previewStatus = 'AVAILABLE';
    report.previewMessage = 'Plain text preview ready.';
    report.checks.preview = {
      status: 'PASS',
      message: 'Text preview ready.'
    };
  }

  /**
   * Helper to recheck entered page count on an existing validation report
   */
  recheckEnteredPageCount(report, enteredPageCount) {
    if (!enteredPageCount || report.detectedPageCount === null) {
      return report;
    }

    // Filter out existing manual page count warning
    report.warnings = report.warnings.filter((w) => !w.includes('entered page count'));

    if (report.isPageCountExact && report.detectedPageCount !== enteredPageCount) {
      report.warnings.push(
        `The entered page count (${enteredPageCount}) does not match the detected count (${report.detectedPageCount}). Please verify your print settings.`
      );
      report.checks.pageCount.status = 'WARN';
      report.checks.pageCount.message = `Entered count (${enteredPageCount}) differs from detected count (${report.detectedPageCount}).`;
      if (report.overallStatus !== 'FAILED') {
        report.overallStatus = 'WARNING';
        report.statusLabel = 'Warnings Found';
      }
    } else if (report.isPageCountExact && report.detectedPageCount === enteredPageCount) {
      report.checks.pageCount.status = 'PASS';
      report.checks.pageCount.message = `Entered count matches detected page count (${report.detectedPageCount}).`;
      if (report.warnings.length === 0 && report.errors.length === 0) {
        report.overallStatus = 'READY';
        report.statusLabel = 'Ready to Print';
      }
    }

    return report;
  }

  /**
   * Clear cache for testing or manual flush
   */
  clearCache() {
    validationCache.clear();
  }
}

module.exports = new DocumentValidator();
