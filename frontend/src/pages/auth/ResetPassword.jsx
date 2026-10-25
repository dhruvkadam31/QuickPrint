import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  customerVerifyResetToken,
  customerResetPassword,
  vendorVerifyResetToken,
  vendorResetPassword,
} from "../../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const accountType = searchParams.get("type") === "vendor" ? "vendor" : "customer";
  const isVendor = accountType === "vendor";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const background = isVendor
    ? "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)"
    : "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)";
  const brandColor = isVendor ? "var(--success)" : "var(--brand)";
  const loginPath = isVendor ? "/vendor/login" : "/";
  const forgotPath = `/forgot-password?type=${accountType}`;

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setTokenError("No reset token provided. Please request a new password reset link.");
        setTokenValid(false);
        setVerifying(false);
        return;
      }

      try {
        const verifyFn = isVendor ? vendorVerifyResetToken : customerVerifyResetToken;
        const res = await verifyFn(token);
        if (res.data?.valid) {
          setTokenValid(true);
          setMaskedEmail(res.data.email || "");
        } else {
          setTokenValid(false);
          setTokenError(res.data?.error || "This reset token is invalid or has expired.");
        }
      } catch (err) {
        setTokenValid(false);
        setTokenError(
          err.response?.data?.error ||
            "This password reset link is invalid or has expired. Please request a new one."
        );
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token, isVendor]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const resetFn = isVendor ? vendorResetPassword : customerResetPassword;
      await resetFn({ token, password });
      setSuccess(true);
      toast.success("Password reset successfully! 🎉");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const isLengthValid = password.length >= 6;
  const isMatch = password.length > 0 && password === confirmPassword;

  return (
    <div className="auth-wrapper" style={{ background }}>
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo" style={{ color: brandColor }}>
          {isVendor ? "🏪 Vendor Portal" : "🖨️ QuickPrint"}
        </div>
        <p className="auth-subtitle">
          {isVendor ? "Vendor Password Reset" : "Customer Password Reset"}
        </p>

        {verifying ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: `3px solid var(--gray-200)`,
                borderTopColor: brandColor,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px auto",
              }}
            />
            <p style={{ color: "var(--gray-600)", fontSize: "0.92rem" }}>
              Verifying reset token security...
            </p>
          </div>
        ) : !tokenValid ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 16px auto",
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--gray-800)", marginBottom: 8 }}>
              Link Expired or Invalid
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--gray-600)",
                lineHeight: 1.5,
                background: "var(--gray-50)",
                border: "1px solid var(--gray-200)",
                borderRadius: 8,
                padding: "14px",
                marginBottom: 20,
              }}
            >
              {tokenError}
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--gray-400)", marginBottom: 20 }}>
              Password reset links can only be used once and expire after 15 minutes for your account security.
            </p>

            <button
              className={`btn ${isVendor ? "btn-success" : "btn-primary"} btn-full`}
              onClick={() => navigate(forgotPath)}
              style={{ marginBottom: 10 }}
            >
              Request a New Reset Link
            </button>

            <button
              className="btn btn-ghost btn-full"
              style={{ fontSize: "0.85rem", padding: "8px" }}
              onClick={() => navigate(loginPath)}
            >
              Back to Login
            </button>
          </div>
        ) : success ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "#d1fae5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 16px auto",
              }}
            >
              ✅
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--gray-800)", marginBottom: 8 }}>
              Password Reset Complete!
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--gray-600)",
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Your password has been successfully updated. You can now log in using your new password.
            </p>

            <button
              className={`btn ${isVendor ? "btn-success" : "btn-primary"} btn-full`}
              onClick={() => navigate(loginPath)}
            >
              Proceed to {isVendor ? "Vendor Sign In" : "Customer Sign In"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--gray-800)", marginBottom: 4 }}>
                Set new password
              </h3>
              {maskedEmail && (
                <p style={{ fontSize: "0.85rem", color: "var(--gray-600)" }}>
                  Resetting password for <strong>{maskedEmail}</strong>
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="form-group">
              <label className="input-label">New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  style={{ paddingRight: 40 }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: "var(--gray-400)",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group">
              <label className="input-label">Confirm New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: "var(--gray-400)",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Validation indicators */}
            <div
              style={{
                background: "var(--gray-50)",
                border: "1px solid var(--gray-200)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 18,
                fontSize: "0.82rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: isLengthValid ? "#16a34a" : "var(--gray-500)" }}>
                <span>{isLengthValid ? "✓" : "○"}</span>
                <span>Minimum 6 characters</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: isMatch ? "#16a34a" : "var(--gray-500)" }}>
                <span>{isMatch ? "✓" : "○"}</span>
                <span>Both passwords match</span>
              </div>
            </div>

            <button
              className={`btn ${isVendor ? "btn-success" : "btn-primary"} btn-full`}
              type="submit"
              disabled={submitting || !isLengthValid || !isMatch}
            >
              {submitting ? "Updating password..." : "Reset Password"}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
          <Link
            to={loginPath}
            style={{
              fontSize: "0.88rem",
              color: "var(--gray-600)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            ← Back to {isVendor ? "Vendor Login" : "Customer Sign In"}
          </Link>
        </div>
      </div>
    </div>
  );
}
