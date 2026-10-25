const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Vendor = require("../models/Vendor");
const { sendPasswordResetEmail } = require("./emailService");

const TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Hash raw token with SHA-256 for secure storage and comparison
 */
function hashToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return "";
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generate cryptographically secure token and its SHA-256 hash
 */
function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);
  return { rawToken, tokenHash, expiresAt };
}

/**
 * Escape regex special characters for safe query matching
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Mask email for public verification feedback (e.g. j***e@example.com)
 */
function maskEmail(email) {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

/**
 * Request password reset (Forgot Password)
 * Returns a neutral response regardless of whether the email exists.
 */
async function requestPasswordReset({ email, accountType }) {
  const normalizedType = (accountType || "CUSTOMER").toUpperCase();
  const neutralMessage = "If an account exists for this email, password reset instructions will be sent.";

  if (!email || typeof email !== "string") {
    return { success: true, message: neutralMessage };
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: true, message: neutralMessage };
  }

  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return { success: true, message: neutralMessage };
  }

  try {
    let account = null;

    if (normalizedType === "VENDOR") {
      account = await Vendor.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(cleanEmail)}$`, "i") },
      });
    } else {
      account = await User.findOne({ email: cleanEmail });
    }

    if (account) {
      const { rawToken, tokenHash, expiresAt } = generateResetToken();

      account.resetPasswordToken = tokenHash;
      account.resetPasswordExpires = expiresAt;
      await account.save();

      const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
      const typeParam = normalizedType === "VENDOR" ? "vendor" : "customer";
      const resetUrl = `${frontendBase}/reset-password?token=${rawToken}&type=${typeParam}`;

      // Asynchronously trigger email without exposing token in response or logs
      sendPasswordResetEmail({
        to: account.email,
        resetUrl,
        accountType: normalizedType,
      }).catch((err) => {
        console.warn(`Email delivery failed gracefully for ${normalizedType}:`, err.message);
      });
    }

    return { success: true, message: neutralMessage };
  } catch (error) {
    console.error("Password reset request error:", error.message);
    // Even on internal error, avoid exposing whether the account exists
    return { success: true, message: neutralMessage };
  }
}

/**
 * Verify validity of a reset token
 */
async function verifyResetToken({ token, accountType }) {
  const normalizedType = (accountType || "CUSTOMER").toUpperCase();

  if (!token || typeof token !== "string" || token.length < 10) {
    return { valid: false, error: "Password reset token is invalid or missing" };
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return { valid: false, error: "Database offline. Please try again later." };
  }

  try {
    let account = null;

    if (normalizedType === "VENDOR") {
      account = await Vendor.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { $gt: now },
      });
    } else {
      account = await User.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { $gt: now },
      });
    }

    if (!account) {
      return { valid: false, error: "Password reset token is invalid or has expired" };
    }

    return {
      valid: true,
      message: "Reset token is valid",
      accountType: normalizedType,
      email: maskEmail(account.email),
    };
  } catch (error) {
    console.error("Token verification error:", error.message);
    return { valid: false, error: "Failed to verify reset token" };
  }
}

/**
 * Complete password reset with new password
 */
async function resetPassword({ token, password, accountType }) {
  const normalizedType = (accountType || "CUSTOMER").toUpperCase();

  if (!password || typeof password !== "string") {
    return { success: false, status: 400, error: "Password is required" };
  }

  if (password.length < 6) {
    return { success: false, status: 400, error: "Password must be at least 6 characters" };
  }

  if (!token || typeof token !== "string") {
    return { success: false, status: 400, error: "Password reset token is invalid or has expired" };
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    return { success: false, status: 503, error: "Database offline. Please try again later." };
  }

  try {
    if (normalizedType === "VENDOR") {
      const vendor = await Vendor.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { $gt: now },
      });

      if (!vendor) {
        return { success: false, status: 400, error: "Password reset token is invalid or has expired" };
      }

      // Hash password and invalidate reset token
      const hashedPassword = await bcrypt.hash(password, 10);
      vendor.password = hashedPassword;
      vendor.resetPasswordToken = undefined;
      vendor.resetPasswordExpires = undefined;
      vendor.passwordChangedAt = new Date();
      await vendor.save();

      return {
        success: true,
        message: "Vendor password has been successfully reset. You can now log in.",
      };
    } else {
      const user = await User.findOne({
        resetPasswordToken: tokenHash,
        resetPasswordExpires: { $gt: now },
      });

      if (!user) {
        return { success: false, status: 400, error: "Password reset token is invalid or has expired" };
      }

      // User pre("save") hook will hash the plain password automatically
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.passwordChangedAt = new Date();
      await user.save();

      return {
        success: true,
        message: "Password has been successfully reset. You can now log in.",
      };
    }
  } catch (error) {
    console.error("Password reset execution error:", error.message);
    return { success: false, status: 500, error: "Failed to reset password" };
  }
}

module.exports = {
  hashToken,
  generateResetToken,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  TOKEN_EXPIRY_MS,
};
