// src/pages/SignInSignUp.js
import React, { use, useState } from "react";
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
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isRegister) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match!");
          return;
        }

        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
        toast.success("Account created!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);

        // ✅ Check if this user is admin
        if (email === "admin@quickprint.com") {
          localStorage.setItem("isAdmin", "true");
        } else {
          localStorage.setItem("isAdmin", "false");
        }

        toast.success("Logged in!");
      }
    } catch (err) {
      toast.error(err.message);
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
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${isRegister ? "active" : ""}`}
            onClick={() => setIsRegister(true)}
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
              />
            </div>
          )}

          <button type="submit" className="btn-primary">
            {isRegister ? "Sign Up" : "Sign In"}
          </button>
        </form>

        {/* Admin Login Button */}
        <button 
          className="btn-secondary" 
          style={{ marginTop: '10px' }}
          onClick={() => nav('/admin_login')}
        >
          Login As Admin
        </button>
      </div>
    </div>
  );
}
