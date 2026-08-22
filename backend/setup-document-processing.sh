# Document Processing Setup Script

#!/bin/bash

echo "🚀 Setting up QuickPrint Document Processing..."

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install sharp pdf-parse pdf-lib libreoffice-convert fs-extra

echo "📁 Creating required directories..."
mkdir -p uploads processed temp

echo "🔧 Checking LibreOffice installation..."
if ! command -v libreoffice &> /dev/null; then
    echo "⚠️  LibreOffice not found. Please install it for document conversion:"
    echo "   Ubuntu/Debian: sudo apt install libreoffice"
    echo "   macOS: brew install libreoffice"
    echo "   Windows: Download from https://www.libreoffice.org/"
else
    echo "✅ LibreOffice found"
fi

echo "🧪 Running basic tests..."
node -e "
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
console.log('✅ All dependencies loaded successfully');
"

echo "🎉 Document processing setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the server: npm run dev"
echo "2. Test file upload from the frontend"
echo "3. Check logs for processing confirmations"
echo ""
echo "📖 See DOCUMENT_PROCESSING_README.md for detailed documentation"