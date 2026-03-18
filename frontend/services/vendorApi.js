import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const vendorApi = {
  // Auth
  login: (email, password) => 
    axios.post(`${API_BASE_URL}/vendors/login`, { email, password }),
  
  // Vendor Info
  getVendor: (vendorId) => 
    axios.get(`${API_BASE_URL}/vendors/${vendorId}`),
  
  updateShopStatus: (vendorId, shopOpen) => 
    axios.patch(`${API_BASE_URL}/vendors/${vendorId}/shop-status`, { shopOpen }),
  
  // Orders
  getVendorOrders: (vendorId) => 
    axios.get(`${API_BASE_URL}/vendors/${vendorId}/orders`),
  
  updateOrderStatus: (orderId, status) => 
    axios.patch(`${API_BASE_URL}/orders/${orderId}`, { status }),
  
  // Queue
  getVendorQueue: (vendorId) => 
    axios.get(`${API_BASE_URL}/orders/queue?vendorId=${vendorId}`),
  
  getQueuePosition: (orderId) => 
    axios.get(`${API_BASE_URL}/orders/queue-position/${orderId}`),
  
  // Revenue
  getRevenue: (vendorId) => 
    axios.get(`${API_BASE_URL}/vendors/${vendorId}/revenue`),
  
  getRevenueStats: (vendorId) => 
    axios.get(`${API_BASE_URL}/vendors/${vendorId}/revenue/stats`),
  
  // Print
  getPrinters: () => 
    axios.get(`${API_BASE_URL}/printers`),
  
  printOrder: (orderId, printerId, fileUrl, printConfig) => 
    axios.post(`${API_BASE_URL}/print`, { orderId, printerId, fileUrl, printConfig }),
};

export default vendorApi;