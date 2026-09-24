const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getUsersCollection, getVendorsCollection } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "quickprint_super_secret_jwt_key_2026";
const JWT_EXPIRES_IN = "7d";

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with bcrypt hash
 */
async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Vendor Login Handler
 */
async function vendorLogin(email, password) {
  const vendorsCollection = getVendorsCollection();
  const vendor = await vendorsCollection.findOne({ email });

  if (!vendor) {
    throw new Error("Invalid vendor credentials");
  }

  // Check password
  let isMatch = false;
  if (vendor.passwordHash) {
    isMatch = await comparePassword(password, vendor.passwordHash);
  } else if (vendor.password) {
    // Legacy support
    isMatch = (password === vendor.password);
  } else if (password === "admin123" || password === "admin456") {
    // Default fallback demo credentials
    isMatch = true;
  }

  if (!isMatch) {
    throw new Error("Invalid vendor password");
  }

  const token = generateToken({
    vendorId: vendor.vendorId,
    email: vendor.email,
    role: "VENDOR",
    name: vendor.name,
  });

  const safeVendor = {
    vendorId: vendor.vendorId,
    name: vendor.name,
    email: vendor.email,
    phone: vendor.phone,
    address: vendor.address,
    services: vendor.services,
    shopOpen: vendor.shopOpen !== false,
    currentQueue: vendor.currentQueue || 0,
    estimatedWaitTime: vendor.estimatedWaitTime || 5,
  };

  return { token, vendor: safeVendor };
}

/**
 * Admin Login Handler
 */
async function adminLogin(password) {
  const usersCollection = getUsersCollection();
  const adminUser = await usersCollection.findOne({ role: "ADMIN" });

  let isMatch = false;
  if (adminUser && adminUser.passwordHash) {
    isMatch = await comparePassword(password, adminUser.passwordHash);
  } else {
    isMatch = (password === "admin123");
  }

  if (!isMatch) {
    throw new Error("Invalid admin password");
  }

  const token = generateToken({
    userId: adminUser?.userId || "ADMIN_001",
    email: adminUser?.email || "admin@quickprint.com",
    role: "ADMIN",
    name: "QuickPrint Admin",
  });

  return {
    token,
    user: {
      userId: adminUser?.userId || "ADMIN_001",
      email: adminUser?.email || "admin@quickprint.com",
      role: "ADMIN",
      name: "QuickPrint Admin",
    },
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  vendorLogin,
  adminLogin,
  JWT_SECRET,
};
