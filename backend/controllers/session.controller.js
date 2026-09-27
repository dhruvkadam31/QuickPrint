const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function adminLogin(req, res) {
  const { password } = req.body;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!password || !passwordHash) {
    return res.status(503).json({ error: "Admin login is not configured" });
  }

  try {
    if (!(await bcrypt.compare(password, passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: "admin", role: "ADMIN" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({ success: true, token });
  } catch (error) {
    console.error("Admin login failed:", error.message);
    return res.status(500).json({ error: "Unable to log in" });
  }
}

module.exports = { adminLogin };