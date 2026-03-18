module.exports = {
  COMMISSION_RATE: 0.10, // 10%
  AVG_TIME_PER_ORDER: 10, // minutes
  SUPPORTED_FILE_TYPES: [
    // Images
    ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".gif",
    // Documents
    ".doc", ".docx", ".dot", ".dotx", ".docm", ".odt",
    ".ppt", ".pptx", ".pot", ".potx", ".pps", ".ppsx", ".pptm", ".odp",
    ".xls", ".xlsx", ".xlt", ".xltx", ".xlsm", ".ods",
    ".rtf", ".txt", ".html", ".htm",
    // PDF
    ".pdf"
  ],
  ORDER_STATUS: {
    PENDING: "payment_pending",
    QUEUED: "Queued",
    IN_PROGRESS: "In Progress",
    READY: "Ready",
    PICKED_UP: "Picked Up"
  },
  PRINTERS: [
    { 
      id: "printer1", 
      name: "HP LaserJet Pro M404dn", 
      location: "Counter 1",
      type: "laser",
      supportsColor: false,
      supportsDuplex: true
    },
    { 
      id: "printer2", 
      name: "Canon imageCLASS LBP623Cdw", 
      location: "Counter 2",
      type: "laser", 
      supportsColor: true,
      supportsDuplex: true
    },
    { 
      id: "printer3", 
      name: "Epson WorkForce WF-2860", 
      location: "Back Office",
      type: "inkjet",
      supportsColor: true,
      supportsDuplex: true
    },
    { 
      id: "printer4", 
      name: "Brother HL-L8360CDW", 
      location: "Color Station",
      type: "laser",
      supportsColor: true,
      supportsDuplex: true
    }
  ]
};