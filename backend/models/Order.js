class Order {
  constructor(data) {
    this.orderId = data.orderId || Date.now().toString();
    this.userId = data.userId;
    this.vendorId = data.vendorId;
    this.vendorName = data.vendorName;
    this.serviceType = data.serviceType;
    this.fileUrl = data.fileUrl;
    this.quantity = data.quantity || 1;
    this.instructions = data.instructions || "";
    this.estimatedPrice = data.estimatedPrice;
    this.commission = data.commission;
    this.vendorEarnings = data.vendorEarnings;
    this.pageCount = data.pageCount || 1;
    this.totalPages = data.totalPages || data.quantity || 1;
    this.color = data.color || "B&W";
    this.sides = data.sides || "Single";
    this.orientation = data.orientation || "Portrait";
    this.razorpayOrderId = data.razorpayOrderId;
    this.razorpayPaymentId = data.razorpayPaymentId;
    this.paymentStatus = data.paymentStatus || "pending";
    this.status = data.status || "payment_pending";
    this.queuePosition = data.queuePosition;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.paidAt = data.paidAt;
    this.printStartedAt = data.printStartedAt;
    this.readyAt = data.readyAt;
    this.pickedUpAt = data.pickedUpAt;
    this.printerUsed = data.printerUsed;
    this.printHistory = data.printHistory || [];
  }
}

module.exports = Order;