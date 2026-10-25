const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

module.exports = async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Determine role
    const role = decoded.role ||
      (decoded.vendorId ? "VENDOR" : null) ||
      (decoded.sub === "admin" ? "ADMIN" : "CUSTOMER");

    // Invalidate tokens issued prior to a password reset if database is connected
    if (mongoose.connection && mongoose.connection.readyState === 1 && decoded.iat) {
      if (role === "CUSTOMER" && (decoded.userId || decoded.sub)) {
        const User = require("../models/User");
        const user = await User.findById(decoded.userId || decoded.sub).select("passwordChangedAt");
        if (user?.passwordChangedAt && Math.floor(user.passwordChangedAt.getTime() / 1000) > decoded.iat) {
          return res.status(401).json({ error: "Session expired due to password change. Please log in again." });
        }
      } else if (role === "VENDOR" && decoded.vendorId) {
        const Vendor = require("../models/Vendor");
        const vendor = await Vendor.findById(decoded.vendorId).select("passwordChangedAt");
        if (vendor?.passwordChangedAt && Math.floor(vendor.passwordChangedAt.getTime() / 1000) > decoded.iat) {
          return res.status(401).json({ error: "Session expired due to password change. Please log in again." });
        }
      }
    }

    req.user = { ...decoded, role };

    if (role === "VENDOR") req.vendor = decoded;

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
