const rateLimit = require("express-rate-limit");

// General API rate limiter: max 300 requests per 15 mins
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// Sensitive endpoints rate limiter (Auth / Payments): max 30 requests per 15 mins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication or payment attempts, please try again later.",
  },
});

// Password reset rate limiter: max 5 requests per 15 mins to prevent email flooding
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many password reset requests from this IP, please try again after 15 minutes.",
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
};
