import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { customerForgotPassword, vendorForgotPassword } from "../../services/api";

export default function ForgotPassword() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get("type") === "vendor" ? "vendor" : "customer";
  const [accountType, setAccountType] = useState(initialType);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "vendor" || type === "customer") {
      setAccountType(type);
    }
  }, [searchParams]);

  const handleTypeChange = (type) => {
    setAccountType(type);
    setSearchParams({ type });
    setSubmitted(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your registered email address");
      return;
    }

    setLoading(true);
    try {
      if (accountType === "vendor") {
        await vendorForgotPassword(email);
      } else {
        await customerForgotPassword(email);
      }
      setSubmitted(true);
      toast.success("Reset instructions sent if account exists");
    } catch (err) {
      // Keep response neutral even on unexpected errors
      setSubmitted(true);
      toast.success("Request received. Check your email for next steps.");
    } finally {
      setLoading(false);
    }
  };

  const isVendor = accountType === "vendor";
  const background = isVendor
    ? "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)"
    : "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)";
  const brandColor = isVendor ? "var(--success)" : "var(--brand)";
  const loginPath = isVendor ? "/vendor/login" : "/";

  return (
    <div className="auth-wrapper" style={{ background }}>
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo" style={{ color: brandColor }}>
          {isVendor ? "🏪 Vendor Portal" : "🖨️ QuickPrint"}
        </div>
        <p className="auth-subtitle">
          {isVendor ? "Vendor Account Recovery" : "Account Password Recovery"}
        </p>

        {/* Portal Switcher Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--gray-100)",
            borderRadius: 8,
            padding: 4,
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => handleTypeChange("customer")}
            style={{
              flex: 1,
              padding: "8px",
              border: "none",
              borderRadius: 6,
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              transition: "all 0.15s",
              background: !isVendor ? "white" : "transparent",
              color: !isVendor ? "var(--brand)" : "var(--gray-600)",
              boxShadow: !isVendor ? "var(--shadow)" : "none",
            }}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("vendor")}
            style={{
              flex: 1,
              padding: "8px",
              border: "none",
              borderRadius: 6,
              fontFamily: "inherit",
              fontWeight: 600,
              fontSize: "0.88rem",
              cursor: "pointer",
              transition: "all 0.15s",
              background: isVendor ? "white" : "transparent",
              color: isVendor ? "#065f46" : "var(--gray-600)",
              boxShadow: isVendor ? "var(--shadow)" : "none",
            }}
          >
            Vendor
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--gray-800)", marginBottom: 6 }}>
                Forgot your password?
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--gray-600)", lineHeight: 1.5 }}>
                Enter the email address registered with your {isVendor ? "vendor shop" : "customer account"}. We'll send you a single-use link to reset your password.
              </p>
            </div>

            <div className="form-group">
              <label className="input-label">Registered Email</label>
              <input
                className="input"
                type="email"
                placeholder={isVendor ? "vendor@quickprint.com" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              className={`btn ${isVendor ? "btn-success" : "btn-primary"} btn-full`}
              type="submit"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? "Sending link..." : "Send Reset Instructions"}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: isVendor ? "#d1fae5" : "#dbeafe",
                color: isVendor ? "#059669" : "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.8rem",
                margin: "0 auto 16px auto",
              }}
            >
              ✉️
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--gray-800)", marginBottom: 8 }}>
              Check your email
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
              If an account exists for <strong>{email}</strong>, password reset instructions will be sent.
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--gray-400)", marginBottom: 20 }}>
              The reset link will expire in 15 minutes. Be sure to check your spam or junk folder if you don't see it shortly.
            </p>

            <button
              className={`btn ${isVendor ? "btn-success" : "btn-primary"} btn-full`}
              onClick={() => navigate(loginPath)}
              style={{ marginBottom: 10 }}
            >
              Return to {isVendor ? "Vendor Login" : "Customer Sign In"}
            </button>

            <button
              className="btn btn-ghost btn-full"
              style={{ fontSize: "0.85rem", padding: "8px" }}
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
            >
              Send to another email
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--gray-200)" }}>
          <Link
            to={loginPath}
            style={{
              fontSize: "0.88rem",
              color: "var(--gray-600)",
              textDecoration: "none",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ← Back to {isVendor ? "Vendor Login" : "Customer Sign In"}
          </Link>
        </div>
      </div>
    </div>
  );
}
