// backend/test-document-processor.js
const documentProcessor = require('./services/documentProcessor');
const path = require('path');

// Test with a sample file (you would run this manually)
async function testDocumentProcessing() {
  try {
    console.log('🧪 Testing document processor...');

    // Mock file object (simulate multer file)
    const mockFile = {
      filename: 'test-document.pdf',
      originalname: 'sample.pdf',
      mimetype: 'application/pdf',
      path: path.join(__dirname, 'test-files', 'sample.pdf'),
      size: 1024000 // 1MB
    };

    const result = await documentProcessor.processDocument(mockFile);

    console.log('✅ Processing result:', {
      success: result.success,
      pageCount: result.pageCount,
      fileSize: result.fileSize,
      hasThumbnail: !!result.thumbnailUrl,
      hasProcessed: !!result.processedUrl
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if called directly
if (require.main === module) {
  testDocumentProcessing();
}

module.exports = { testDocumentProcessing };