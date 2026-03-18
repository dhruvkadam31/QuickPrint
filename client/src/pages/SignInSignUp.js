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
  const [name, setName]                     = useState("");
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegister, setIsRegister]         = useState(false);
  const [loading, setLoading]               = useState(false);
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

        // ✅ Clear any stale vendor / admin sessions
        localStorage.removeItem("isVendor");
        localStorage.removeItem("vendorData");
        localStorage.removeItem("isAdmin");

        toast.success("Account created!");
        setTimeout(() => navigate("/upload"), 1000);

      } else {
        await signInWithEmailAndPassword(auth, email, password);

        // ✅ Always clear vendor session first — this was the root bug
        localStorage.removeItem("isVendor");
        localStorage.removeItem("vendorData");

        if (email === "admin@quickprint.com") {
          localStorage.setItem("isAdmin", "true");
          toast.success("Admin login successful!");
          setTimeout(() => navigate("/admin"), 1000);
        } else {
          localStorage.setItem("isAdmin", "false");
          toast.success("Logged in successfully!");
          setTimeout(() => navigate("/upload"), 1000);
        }
      }
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">QuickPrint</h2>
        <p className="auth-subtitle">Fast, reliable printing at your fingertips</p>

        {/* Tabs */}
        <div className="tabs" style={{ width: "100%", marginBottom: 20 }}>
          <button
            type="button"
            className={!isRegister ? "active" : ""}
            onClick={() => setIsRegister(false)}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            type="button"
            className={isRegister ? "active" : ""}
            onClick={() => setIsRegister(true)}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isRegister && (
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Full Name</label>
              <input
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

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
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

          {isRegister && (
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Confirm Password</label>
              <input
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

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Processing…" : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          <button
            className="btn-secondary"
            onClick={() => navigate("/vendor_login")}
            disabled={loading}
          >
            🏪 Login as Vendor
          </button>
          <button
            className="btn-ghost"
            onClick={() => navigate("/admin_login")}
            disabled={loading}
          >
            🔐 Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}