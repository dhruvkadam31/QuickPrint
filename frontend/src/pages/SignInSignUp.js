// src/pages/SignInSignUp.js
import React, { useState } from "react";
import { auth } from "../Firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function SignInSignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match!");
          setLoading(false);
          return;
        }

        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        toast.success("Account created successfully!");

        setTimeout(() => navigate("/upload"), 1000);
      } else {
        await signInWithEmailAndPassword(auth, email, password);

        if (email === "admin@quickprint.com") {
          localStorage.setItem("isAdmin", "true");
          toast.success("Admin login successful!");
          setTimeout(() => navigate("/admin"), 1000);
        } else {
          localStorage.setItem("isAdmin", "false");
          toast.success("Welcome back!");
          setTimeout(() => navigate("/upload"), 1000);
        }
      }
    } catch (err) {
      const msg = err.code === "auth/user-not-found" ? "No account found with this email."
        : err.code === "auth/wrong-password" ? "Incorrect password."
        : err.code === "auth/email-already-in-use" ? "Email already registered."
        : err.message;
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo area */}
        <div className="auth-logo-area">
          <div className="auth-logo-icon">🖨️</div>
          <h1 className="auth-title">QuickPrint</h1>
          <p className="auth-subtitle">Fast, reliable campus printing</p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            id="tab-signin"
            type="button"
            className={`tab-btn${!isRegister ? " active" : ""}`}
            onClick={() => setIsRegister(false)}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            id="tab-signup"
            type="button"
            className={`tab-btn${isRegister ? " active" : ""}`}
            onClick={() => setIsRegister(true)}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-row">
              <label className="input-label" htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                className="input"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-row">
            <label className="input-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <label className="input-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {isRegister && (
            <div className="form-row">
              <label className="input-label" htmlFor="auth-confirm">Confirm Password</label>
              <input
                id="auth-confirm"
                type="password"
                className="input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <button id="auth-submit-btn" type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <><span className="spinner" /> Processing...</>
            ) : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>

        {/* Vendor Login */}
        <button
          id="vendor-login-btn"
          className="btn-secondary"
          onClick={() => navigate("/vendor_login")}
          disabled={loading}
        >
          🏪 Login as Print Shop Vendor
        </button>

        {/* Admin Login */}
        <button
          id="admin-login-btn"
          className="btn-ghost"
          onClick={() => navigate("/admin_login")}
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          🔐 Admin Access
        </button>
      </div>
    </div>
  );
}