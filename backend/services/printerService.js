const { PRINTERS } = require('../config/constants');
const { getCollections } = require('../config/database');
const fs = require("fs");
const path = require("path");
const axios = require('axios');

const getPrinters = () => {
  return PRINTERS;
};

const validatePrinter = (printerId, printConfig) => {
  const selectedPrinter = PRINTERS.find(p => p.id === printerId);
  
  if (!selectedPrinter) {
    return { valid: false, error: "Printer not found" };
  }

  if (printConfig.color === "Color" && !selectedPrinter.supportsColor) {
    return { 
      valid: false, 
      error: `Selected printer (${selectedPrinter.name}) does not support color printing` 
    };
  }

  if (printConfig.sides === "Double" && !selectedPrinter.supportsDuplex) {
    return { 
      valid: false, 
      error: `Selected printer (${selectedPrinter.name}) does not support double-sided printing` 
    };
  }

  return { valid: true, printer: selectedPrinter };
};

const downloadFileForPrinting = async (fileUrl) => {
  if (fileUrl.startsWith('http://localhost:5000/')) {
    const filename = path.basename(fileUrl);
    const filePath = path.join(__dirname, '../converted', filename);
    return fs.readFileSync(filePath);
  } else {
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }
};

const calculatePrintTime = (printer, totalPages) => {
  const pagesPerMinute = printer.type === 'laser' ? 20 : 10;
  return Math.ceil((totalPages / pagesPerMinute) * 60);
};

module.exports = {
  getPrinters,
  validatePrinter,
  downloadFileForPrinting,
  calculatePrintTime
};