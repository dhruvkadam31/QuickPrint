const jwt = require("jsonwebtoken");
const { getFirebaseAuth } = require("../services/firebaseAdmin");

module.exports = async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const role = decoded.role || (decoded.vendorId ? "VENDOR" : null);
      if (!role) throw new Error("Token has no role");

      req.user = { ...decoded, role };
      if (role === "VENDOR") req.vendor = decoded;
      return next();
    } catch {
      const decoded = await getFirebaseAuth().verifyIdToken(token);
      req.user = {
        userId: decoded.uid,
        email: decoded.email,
        name: decoded.name,
        role: "CUSTOMER",
      };
      req.firebaseUser = decoded;
      return next();
    }
  } catch {
    return res.status(401).json({ error: "Invalid or unverifiable token" });
  }
};
