/**
 * Role-Based Access Control (RBAC) Middleware.
 * Enforces allowed roles for protected routes.
 * Roles: CUSTOMER, VENDOR, ADMIN
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // If no user context attached, check fallback headers or default to guest
    const userRole = req.user?.role || req.headers["x-user-role"] || "CUSTOMER";

    // Normalize roles to uppercase
    const normalizedAllowedRoles = allowedRoles.map((r) => r.toUpperCase());
    const normalizedUserRole = userRole.toUpperCase();

    // ADMIN always has full access
    if (normalizedUserRole === "ADMIN") {
      return next();
    }

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires role: ${allowedRoles.join(" or ")}, but your role is ${userRole}.`,
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
};
