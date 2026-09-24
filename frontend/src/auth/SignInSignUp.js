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
        toast.success("Account created!");
        
        // Redirect after successful registration
        setTimeout(() => {
          navigate("/upload");
        }, 1000);
        
      } else {
        await signInWithEmailAndPassword(auth, email, password);

        // ✅ Check if this user is admin
        if (email === "admin@quickprint.com") {
          localStorage.setItem("isAdmin", "true");
          toast.success("Admin login successful!");
          setTimeout(() => {
            navigate("/admin");
          }, 1000);
        } else {
          localStorage.setItem("isAdmin", "false");
          toast.success("Logged in successfully!");
          // Redirect regular users to upload page
          setTimeout(() => {
            navigate("/upload");
          }, 1000);
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
        {/* QuickPrint heading & slogan */}
        <h2 className="auth-title">QuickPrint</h2>
        <p className="auth-subtitle">Fast, reliable printing at your fingertips</p>

        {/* Tabs */}
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${!isRegister ? "active" : ""}`}
            onClick={() => setIsRegister(false)}
            disabled={loading}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${isRegister ? "active" : ""}`}
            onClick={() => setIsRegister(true)}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Sign Up extra field */}
          {isRegister && (
            <div className="form-row">
              <label className="input-label">Name</label>
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

          <div className="form-row">
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

          <div className="form-row">
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

          {/* Confirm password only on Sign Up */}
          {isRegister && (
            <div className="form-row">
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

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Processing..." : (isRegister ? "Sign Up" : "Sign In")}
          </button>
        </form>

        {/* Vendor Login Button */}
        <button 
          className="btn-secondary" 
          style={{ marginTop: '10px', width: '100%' }}
          onClick={() => navigate('/vendor_login')}
          disabled={loading}
        >
          {loading ? "Processing..." : "Login As Vendor"}
        </button>

        {/* Admin Login Link */}
        <button 
          className="btn-ghost" 
          style={{ marginTop: '10px', width: '100%' }}
          onClick={() => navigate('/admin_login')}
          disabled={loading}
        >
          {loading ? "Processing..." : "Admin Login"}
        </button>
      </div>
    </div>
  );
}