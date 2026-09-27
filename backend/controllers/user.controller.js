const User = require("../models/User");
const jwt = require("jsonwebtoken");

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: "CUSTOMER",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: { userId: user._id.toString(), email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ error: "Registration failed" });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      token,
      user: { userId: user._id.toString(), email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Login failed" });
  }
}

// POST /api/auth/me  (verify token and return user info)
async function me(req, res) {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ error: "Could not fetch user" });
  }
}

module.exports = { register, login, me };
