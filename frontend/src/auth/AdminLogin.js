import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function AdminLogin({ setIsAdmin }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    
    // Simple admin check - in production, use proper authentication
    if (password === "admin123") {
      localStorage.setItem("isAdmin", "true");
      setIsAdmin(true);
      toast.success("✅ Admin login successful!");
      navigate("/admin");
    } else {
      toast.error("❌ Invalid admin password!");
    }
    
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">🔐 Admin Login</h2>
        <p className="auth-subtitle">Enter admin credentials to access dashboard</p>

        <div className="form-row">
          <label className="input-label">Admin Password</label>
          <input
            type="password"
            className="input"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
          />
          <p className="small-muted" style={{ marginTop: 8 }}>
            Hint: admin123
          </p>
        </div>

        <button 
          className="btn-primary" 
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Verifying..." : "Login as Admin"}
        </button>

        <button 
          className="btn-secondary" 
          style={{ marginTop: 12 }}
          onClick={() => navigate("/")}
        >
          Back to User Login
        </button>
      </div>
    </div>
  );
}