const jwt = require("jsonwebtoken");

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

    req.user = { ...decoded, role };

    if (role === "VENDOR") req.vendor = decoded;

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
