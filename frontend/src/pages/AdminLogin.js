// src/pages/AdminLogin.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    setTimeout(() => {
      if (password === "admin123") {
        localStorage.setItem("isAdmin", "true");
        navigate("/admin");
      } else {
        setError("Invalid admin access key. Please try again.");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div className="logo-icon-wrapper" style={{ margin: "0 auto 16px auto", background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)" }}>
            🛡️
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", color: "var(--slate-900)", marginBottom: "6px" }}>
            Admin Portal
          </h1>
          <p className="small-muted">
            Restricted access — enter your administrator security passphrase to proceed.
          </p>
        </div>

        {error && (
          <div className="badge badge-error" style={{ display: "block", textAlign: "center", marginBottom: "20px", padding: "12px" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="admin-password">
              Admin Passphrase
            </label>
            <input
              id="admin-password"
              type="password"
              className="form-control"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "12px", background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)" }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span className="spinner"></span> Authenticating...
              </span>
            ) : (
              "Login to Admin Dashboard →"
            )}
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--slate-200)", textAlign: "center" }}>
          <button
            onClick={() => navigate("/")}
            className="btn-secondary"
            style={{ width: "100%", fontSize: "14px" }}
          >
            ← Return to Student Login
          </button>
        </div>
      </div>
    </div>
  );
}