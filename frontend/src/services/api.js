// src/services/api.js
import axios from "axios";
import { auth } from "../firebase";

const BASE_URL = "http://localhost:5000";

const api = axios.create({ baseURL: BASE_URL });

// Attach vendor or admin JWT token to every request if present
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("vendorToken") || localStorage.getItem("adminToken");
  if (!token && auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── VENDOR ──────────────────────────────────────────────
export const vendorRegister = (data) => api.post("/vendor/register", data);
export const vendorLogin = (data) => api.post("/vendor/login", data);
export const vendorLogout = (data) => api.post("/vendor/logout", data);

export const getAvailableVendors = () => api.get("/vendor/available");
export const getVendorOrders = (vendorId) =>
  api.get(`/vendor/${vendorId}/orders`);
export const toggleShopStatus = (vendorId, shopOpen) =>
  api.patch(`/vendor/${vendorId}/shop-status`, { shopOpen });
export const updateVendorSettings = (vendorId, data) =>
  api.patch(`/vendor/${vendorId}/settings`, data);
export const getVendorRevenue = (vendorId) =>
  api.get(`/vendor/${vendorId}/revenue`);

// ─── ORDERS ──────────────────────────────────────────────
export const uploadFile = (formData) =>
  api.post("/orders/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const createOrder = (data) => api.post("/orders/create", data);
export const initiatePayment = (data) => api.post("/api/payments/initiate", data);
export const verifyPayment = (data) => api.post("/api/payments/verify", data);
export const getUserOrders = (userId) => api.get(`/orders/user/${userId}`);
export const updateOrderStatus = (orderId, status) =>
  api.patch(`/orders/${orderId}/status`, { status });
export const cancelOrder = (orderId, data) =>
  api.post(`/orders/${orderId}/cancel`, data);
export const loginAdmin = (password) => api.post("/api/auth/admin/login", { password });
export const verifyOTP = (data) => api.post("/orders/verify-otp", data);
export const getVendorQueue = (vendorId) =>
  api.get(`/orders/queue/${vendorId}`);

// ─── ADMIN & ANALYTICS ──────────────────────────────────
export const getAdminAnalyticsSummary = () => api.get("/api/analytics/summary");
export const getAllOrdersAdmin = () => api.get("/orders/admin/all");

// ─── ML PREDICTIONS ──────────────────────────────────────
export const getDemandPrediction = (data) => api.post("/api/ml/demand", data);
export const getWaitTimePrediction = (data) => api.post("/api/ml/waittime", data);

export default api;
