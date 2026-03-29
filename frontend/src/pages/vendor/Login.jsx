import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { vendorLogin } from "../../services/api";
import socket from "../../services/socket";

export default function VendorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {const res = await vendorLogin({ email, password });
const { token, vendor } = res.data;

if (!vendor?.vendorId) {
  throw new Error("Invalid vendor data");
}

localStorage.setItem("vendorToken", token);
localStorage.setItem("vendorData", JSON.stringify(vendor));

socket.emit("vendor-online", vendor.vendorId);

toast.success(`Welcome, ${vendor.name}! 🏪`);
navigate("/vendor/dashboard");} catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)" }}>
      <div className="auth-card">
        <div className="auth-logo" style={{ color: "var(--success)" }}>🏪 Vendor Portal</div>
        <p className="auth-subtitle">Sign in to manage your print orders</p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="input-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="vendor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="input-label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button className="btn btn-success btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Signing in..." : "Sign In as Vendor"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span className="text-muted">Are you a user? </span>
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 14px", fontSize: "0.85rem", borderColor: "var(--gray-200)" }}
            onClick={() => navigate("/")}
          >
            User Login →
          </button>
        </div>
      </div>
    </div>
  );
}
