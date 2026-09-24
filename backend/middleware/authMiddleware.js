const { verifyToken } = require("../services/authService");

/**
 * Middleware to authenticate requests using JWT Bearer token or Firebase token header.
 * Allows anonymous/guest operations if not required by route, but attaches user info if token exists.
 */
function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Check custom x-user-id / x-user-role headers if passed
      if (req.headers["x-user-id"]) {
        req.user = {
          userId: req.headers["x-user-id"],
          role: req.headers["x-user-role"] || "CUSTOMER",
        };
      }
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    if (decoded) {
      req.user = decoded;
    }

    next();
  } catch (error) {
    console.error("⚠️ Authentication middleware error:", error.message);
    next();
  }
}

/**
 * Require valid authentication (rejects unauthenticated calls)
 */
function requireAuth(req, res, next) {
  if (!req.user && !req.headers["x-user-id"]) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in to proceed.",
    });
  }
  next();
}

module.exports = {
  authenticateUser,
  requireAuth,
};
