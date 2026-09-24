const { vendorLogin, adminLogin } = require("../services/authService");

async function handleVendorLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    const result = await vendorLogin(email, password);
    return res.json({
      success: true,
      token: result.token,
      vendor: result.vendor,
      message: "Vendor login successful",
    });
  } catch (error) {
    console.error("❌ Vendor login controller error:", error.message);
    return res.status(401).json({ success: false, error: error.message });
  }
}

async function handleAdminLogin(req, res) {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: "Password is required" });
    }

    const result = await adminLogin(password);
    return res.json({
      success: true,
      token: result.token,
      user: result.user,
      message: "Admin login successful",
    });
  } catch (error) {
    console.error("❌ Admin login controller error:", error.message);
    return res.status(401).json({ success: false, error: error.message });
  }
}

module.exports = {
  handleVendorLogin,
  handleAdminLogin,
};
