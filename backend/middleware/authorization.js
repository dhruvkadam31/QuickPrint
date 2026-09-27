function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

function requireUserOrAdmin(paramName = "userId") {
  return (req, res, next) => {
    if (
      req.user?.role === "ADMIN" ||
      String(req.params[paramName]) === String(req.user?.userId)
    ) {
      return next();
    }

    return res.status(403).json({ error: "Cannot access another user's data" });
  };
}

function requireVendorOrAdmin(paramName = "vendorId") {
  return (req, res, next) => {
    const requestedVendorId = String(req.params[paramName]);
    const authenticatedVendorId = String(req.user?.vendorId || "");

    if (
      req.user?.role === "ADMIN" ||
      (req.user?.role === "VENDOR" && requestedVendorId === authenticatedVendorId)
    ) {
      return next();
    }

    return res.status(403).json({ error: "Cannot access another vendor's data" });
  };
}

module.exports = { requireRole, requireUserOrAdmin, requireVendorOrAdmin };