const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const sharp = require('sharp');
const validator = require('../services/documentValidator');

// Helper to generate a multi-page PDF buffer
async function createSamplePdf(pages = 2, withBlankPage = false) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595, 842]);
    if (withBlankPage && i === 1) {
      // Leave page 2 completely blank
      continue;
    }
    page.drawText(`Page ${i + 1} test content for QuickPrint smart checker`, {
      x: 50,
      y: 750,
      size: 14,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

test('1. Valid PDF with multiple pages passes all checks with READY status', async () => {
  validator.clearCache();
  const pdfBuffer = await createSamplePdf(3, false);
  const result = await validator.validateDocument({
    buffer: pdfBuffer,
    originalname: 'annual-report.pdf',
    filename: 'test-valid.pdf',
    size: pdfBuffer.length,
    mimetype: 'application/pdf',
  });

  assert.equal(result.overallStatus, 'READY');
  assert.equal(result.statusLabel, 'Ready to Print');
  assert.equal(result.fileFormat, 'PDF');
  assert.equal(result.detectedPageCount, 3);
  assert.equal(result.isPageCountExact, true);
  assert.equal(result.checks.fileIntegrity.status, 'PASS');
  assert.equal(result.checks.formatValidation.status, 'PASS');
  assert.equal(result.checks.blankPages.status, 'PASS');
  assert.equal(result.checks.preview.status, 'PASS');
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 0);
});

test('2. Empty file (0 bytes) is rejected with FAILED status and actionable message', async () => {
  validator.clearCache();
  const emptyBuffer = Buffer.alloc(0);
  const result = await validator.validateDocument({
    buffer: emptyBuffer,
    originalname: 'empty-file.pdf',
    filename: 'test-empty.pdf',
    size: 0,
    mimetype: 'application/pdf',
  });

  assert.equal(result.overallStatus, 'FAILED');
  assert.equal(result.statusLabel, 'Validation Failed');
  assert.equal(result.checks.fileIntegrity.status, 'FAIL');
  assert.match(result.errors[0], /empty \(0 bytes\)/i);
});

test('3. Corrupted or malformed PDF is detected and fails validation', async () => {
  validator.clearCache();
  // PDF header but corrupted junk body
  const corruptedBuffer = Buffer.from('%PDF-1.4\nJUNKCORRUPTBYTE$!@#^%&*(TRAILERMISSING');
  const result = await validator.validateDocument({
    buffer: corruptedBuffer,
    originalname: 'corrupt-document.pdf',
    filename: 'test-corrupt.pdf',
    size: corruptedBuffer.length,
    mimetype: 'application/pdf',
  });

  assert.equal(result.overallStatus, 'FAILED');
  assert.equal(result.statusLabel, 'Validation Failed');
  assert.equal(result.checks.fileIntegrity.status, 'FAIL');
  assert.match(result.errors[0], /could not be opened|corrupted|unreadable/i);
});

test('4. PDF containing a genuinely blank page generates a WARNING and lists blank pages', async () => {
  validator.clearCache();
  const pdfWithBlank = await createSamplePdf(3, true); // page 2 is blank
  const result = await validator.validateDocument({
    buffer: pdfWithBlank,
    originalname: 'presentation-with-blank.pdf',
    filename: 'test-blank.pdf',
    size: pdfWithBlank.length,
    mimetype: 'application/pdf',
  });

  assert.equal(result.overallStatus, 'WARNING');
  assert.equal(result.statusLabel, 'Warnings Found');
  assert.equal(result.checks.blankPages.status, 'WARN');
  assert.deepEqual(result.checks.blankPages.blankPages, [2]);
  assert.equal(result.checks.blankPages.details[0].type, 'confirmed');
  assert.match(result.warnings[0], /blank page.*detected on page 2/i);
});

test('5. PDF with manually entered page-count mismatch produces a warning', async () => {
  validator.clearCache();
  const pdfBuffer = await createSamplePdf(4, false); // 4 pages
  const result = await validator.validateDocument(
    {
      buffer: pdfBuffer,
      originalname: 'thesis.pdf',
      filename: 'test-mismatch.pdf',
      size: pdfBuffer.length,
      mimetype: 'application/pdf',
    },
    { enteredPageCount: 8, forceRecheck: true }
  );

  assert.equal(result.overallStatus, 'WARNING');
  assert.equal(result.detectedPageCount, 4);
  assert.equal(result.checks.pageCount.status, 'WARN');
  assert.ok(result.warnings.some((w) => w.includes('entered page count (8) does not match')));
});

test('6. Supported DOCX file is validated and marked with estimated page count', async () => {
  validator.clearCache();
  // Create mock docx zip header with word/document.xml marker
  const docxHeader = Buffer.from(
    'PK\x03\x04\x14\x00\x00\x00\x08\x00word/document.xml<w:t>Hello world document text</w:t>[Content_Types].xml'
  );
  const result = await validator.validateDocument({
    buffer: docxHeader,
    originalname: 'assignment.docx',
    filename: 'test-doc.docx',
    size: docxHeader.length,
    mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  assert.equal(result.fileFormat, 'DOCX');
  assert.equal(result.isPageCountExact, false);
  assert.equal(result.checks.formatValidation.status, 'PASS');
  assert.ok(result.warnings.some((w) => w.includes('estimate')));
});

test('7. Unsupported file format (e.g. .exe) is blocked with clear explanation', async () => {
  validator.clearCache();
  const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00BinaryExeCode');
  const result = await validator.validateDocument({
    buffer: exeBuffer,
    originalname: 'installer.exe',
    filename: 'test-app.exe',
    size: exeBuffer.length,
    mimetype: 'application/x-msdownload',
  });

  assert.equal(result.overallStatus, 'FAILED');
  assert.equal(result.checks.formatValidation.status, 'FAIL');
  assert.match(result.errors[0], /not supported.*Supported document formats are/i);
});

test('8. File exceeding size limit (> 20MB) is blocked with clear error', async () => {
  validator.clearCache();
  const largeSize = 25 * 1024 * 1024; // 25 MB
  const fakeLargeFile = {
    buffer: Buffer.alloc(100), // simulate size in stat
    size: largeSize,
    originalname: 'huge-file.pdf',
    filename: 'test-huge.pdf',
    mimetype: 'application/pdf',
  };
  // Inject simulated buffer of length > 20MB
  const bufferOverLimit = Buffer.alloc(21 * 1024 * 1024);
  bufferOverLimit.write('%PDF-1.4');

  const result = await validator.validateDocument({
    buffer: bufferOverLimit,
    originalname: 'huge-file.pdf',
    filename: 'test-huge.pdf',
    size: bufferOverLimit.length,
    mimetype: 'application/pdf',
  });

  assert.equal(result.overallStatus, 'FAILED');
  assert.equal(result.checks.fileIntegrity.status, 'FAIL');
  assert.match(result.errors[0], /exceeds the maximum upload limit of 20 MB/i);
});

test('9. Multiple files validation generates distinct, independent reports', async () => {
  validator.clearCache();
  const pdf1 = await createSamplePdf(2, false);
  const pdf2 = await createSamplePdf(3, true); // contains blank page

  const report1 = await validator.validateDocument({
    buffer: pdf1,
    originalname: 'file1.pdf',
    filename: 'f1.pdf',
    size: pdf1.length,
    mimetype: 'application/pdf',
  });

  const report2 = await validator.validateDocument({
    buffer: pdf2,
    originalname: 'file2.pdf',
    filename: 'f2.pdf',
    size: pdf2.length,
    mimetype: 'application/pdf',
  });

  assert.equal(report1.overallStatus, 'READY');
  assert.equal(report1.detectedPageCount, 2);
  assert.equal(report2.overallStatus, 'WARNING');
  assert.equal(report2.detectedPageCount, 3);
  assert.deepEqual(report2.checks.blankPages.blankPages, [2]);
});

test('10. File with misleading extension (e.g. text renamed to .pdf) fails validation', async () => {
  validator.clearCache();
  const textBuffer = Buffer.from('Just plain text without PDF header or structure');
  const result = await validator.validateDocument({
    buffer: textBuffer,
    originalname: 'fake-contract.pdf',
    filename: 'test-fake.pdf',
    size: textBuffer.length,
    mimetype: 'application/pdf',
  });

  assert.equal(result.overallStatus, 'FAILED');
  assert.equal(result.checks.formatValidation.status, 'FAIL');
  assert.match(result.errors[0], /does not match the actual file signature/i);
});

test('11. Low-resolution image produces print-quality warning', async () => {
  validator.clearCache();
  // 100x100 pixel tiny image
  const smallImg = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  }).jpeg().toBuffer();

  const result = await validator.validateDocument({
    buffer: smallImg,
    originalname: 'icon.jpg',
    filename: 'test-icon.jpg',
    size: smallImg.length,
    mimetype: 'image/jpeg',
  });

  assert.equal(result.overallStatus, 'WARNING');
  assert.equal(result.fileFormat, 'JPEG');
  assert.equal(result.detectedPageCount, 1);
  assert.ok(result.warnings.some((w) => w.includes('Low-resolution image')));
});
