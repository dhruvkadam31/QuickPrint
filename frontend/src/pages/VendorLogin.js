// src/pages/VendorLogin.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function VendorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/vendor/login", { email, password });

      if (response.data.success) {
        localStorage.removeItem("isAdmin");
        localStorage.setItem("isVendor", "true");
        localStorage.setItem("vendorData", JSON.stringify(response.data.vendor));

        toast.success(`Welcome back, ${response.data.vendor.name}!`);

        setTimeout(() => {
          window.location.href = "/vendor/dashboard";
        }, 500);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Login failed. Please check your credentials.";
      toast.error(errorMessage);
      localStorage.removeItem("isVendor");
      localStorage.removeItem("vendorData");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (vendorNumber) => {
    if (vendorNumber === 1) {
      setEmail("vendor1@quickprint.com");
      setPassword("admin123");
    } else {
      setEmail("vendor2@quickprint.com");
      setPassword("admin456");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-logo-area">
          <div className="auth-logo-icon" style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}>
            🏪
          </div>
          <h1 className="auth-title">Vendor Portal</h1>
          <p className="auth-subtitle">Sign in to manage your print shop</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-row">
            <label className="input-label" htmlFor="vendor-email">Email Address</label>
            <input
              id="vendor-email"
              type="email"
              className="input"
              placeholder="vendor@quickprint.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <label className="input-label" htmlFor="vendor-password">Password</label>
            <input
              id="vendor-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            id="vendor-login-submit"
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)" }}
          >
            {loading ? <><span className="spinner" /> Signing in...</> : "Sign In to Dashboard"}
          </button>
        </form>

        {/* Demo Accounts */}
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center", marginBottom: 10 }}>
            Demo Accounts
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              id="demo-vendor1"
              type="button"
              onClick={() => handleDemoLogin(1)}
              className="btn-secondary"
              style={{ flex: 1, fontSize: 13 }}
              disabled={loading}
            >
              🏬 Shop 1
            </button>
            <button
              id="demo-vendor2"
              type="button"
              onClick={() => handleDemoLogin(2)}
              className="btn-secondary"
              style={{ flex: 1, fontSize: 13 }}
              disabled={loading}
            >
              🏬 Shop 2
            </button>
          </div>
        </div>

        {/* Back Link */}
        <button
          id="vendor-back-btn"
          className="btn-ghost"
          onClick={() => navigate("/")}
          style={{ marginTop: 12 }}
        >
          ← Back to Customer Login
        </button>
      </div>
    </div>
  );
}