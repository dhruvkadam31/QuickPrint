// src/pages/VendorLogin.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../Firebase";
import axios from "axios";
import { toast } from "react-toastify";

export default function VendorLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
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
        // ✅ Clear ALL conflicting sessions first
        localStorage.removeItem("isAdmin");

        // ✅ Sign out any Firebase user session so user + vendor don't overlap
        try { await signOut(auth); } catch {}

        // ✅ Set vendor session
        localStorage.setItem("isVendor", "true");
        localStorage.setItem("vendorData", JSON.stringify(response.data.vendor));

        toast.success(`Welcome back, ${response.data.vendor.name}!`);

        // ✅ Use navigate() instead of window.location.href
        // window.location.href caused a full reload which reset React state
        // before App.js could read localStorage, bouncing vendor back to login
        setTimeout(() => navigate("/vendor/dashboard"), 300);
      }
    } catch (err) {
      console.error("Vendor login error:", err);
      toast.error(err.response?.data?.error || "Login failed. Please try again.");
      localStorage.removeItem("isVendor");
      localStorage.removeItem("vendorData");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (n) => {
    if (n === 1) { setEmail("vendor1@quickprint.com"); setPassword("admin123"); }
    if (n === 2) { setEmail("vendor2@quickprint.com"); setPassword("admin456"); }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Vendor Login</h2>
        <p className="auth-subtitle">Access your print shop dashboard</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-row" style={{ marginBottom: 0 }}>
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="vendor@quickprint.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Logging in…" : "Login as Vendor"}
          </button>
        </form>

        {/* Demo accounts */}
        <div style={{ marginTop: 24 }}>
          <div className="section-label" style={{ textAlign: "center", marginBottom: 10 }}>
            Demo Accounts
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={() => handleDemoLogin(1)}
              className="btn-secondary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              VEN001
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin(2)}
              className="btn-secondary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              VEN002
            </button>
          </div>
        </div>

        <button
          className="btn-ghost"
          onClick={() => navigate("/")}
          style={{ marginTop: 12, width: "100%" }}
          disabled={loading}
        >
          ← Back to User Login
        </button>
      </div>
    </div>
  );
}