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
      console.log("🔐 Attempting vendor login for:", email);
      
      const response = await axios.post("http://localhost:3000/vendor/login", {
        email,
        password
      });

      console.log("✅ Login response:", response.data);

      if (response.data.success) {
        // Clear any conflicting sessions
        localStorage.removeItem("isAdmin");
        
        // Set vendor session
        localStorage.setItem("isVendor", "true");
        localStorage.setItem("vendorData", JSON.stringify(response.data.vendor));
        
        console.log("🏪 Vendor session set:", {
          vendorId: response.data.vendor.vendorId,
          name: response.data.vendor.name
        });
        
        toast.success(`Welcome ${response.data.vendor.name}!`);
        
        // ✅ FIX: Use window.location.href for guaranteed redirect
        setTimeout(() => {
          console.log("🔄 FORCE REDIRECT to vendor dashboard");
          window.location.href = "/vendor/dashboard";
        }, 500);
      }
    } catch (err) {
      console.error("❌ Vendor login error:", err);
      const errorMessage = err.response?.data?.error || "Login failed. Please try again.";
      toast.error(errorMessage);
      
      // Clear any invalid session data
      localStorage.removeItem("isVendor");
      localStorage.removeItem("vendorData");
    } finally {
      setLoading(false);
    }
  };

  // Quick demo login buttons
  const handleDemoLogin = (vendorNumber) => {
    if (vendorNumber === 1) {
      setEmail("vendor1@quickprint.com");
      setPassword("admin123");
    } else if (vendorNumber === 2) {
      setEmail("vendor2@quickprint.com");
      setPassword("admin456");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Vendor Login</h2>
        <p className="auth-subtitle">Access your print shop dashboard</p>

        <form onSubmit={handleLogin}>
          <div className="form-row">
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

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '16px', width: '100%' }}
          >
            {loading ? "Logging in..." : "Login as Vendor"}
          </button>
        </form>

        {/* Demo Credentials */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ marginBottom: 12, color: '#666', fontSize: '14px' }}>
            Demo Accounts:
          </p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              type="button"
              onClick={() => handleDemoLogin(1)}
              className="btn-secondary"
              style={{ flex: 1, padding: '8px' }}
              disabled={loading}
            >
              VEN001
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin(2)}
              className="btn-secondary"
              style={{ flex: 1, padding: '8px' }}
              disabled={loading}
            >
              VEN002
            </button>
          </div>
        </div>

        <button 
          className="btn-ghost" 
          onClick={() => navigate('/')}
          style={{ marginTop: '10px', width: '100%' }}
        >
          Back to User Login
        </button>
      </div>
    </div>
  );
}