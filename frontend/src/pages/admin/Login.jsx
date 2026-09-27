import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { loginAdmin } from "../../services/api";

export default function AdminLogin() {
  const [passphrase, setPassphrase] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await loginAdmin(passphrase);
      localStorage.setItem("adminToken", response.data.token);
      localStorage.setItem("isAdmin", "true");
      toast.success("Welcome, Administrator!");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.error || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: 20,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#ffffff",
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontSize: "2.5rem",
              width: 64,
              height: 64,
              margin: "0 auto 12px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fee2e2",
              borderRadius: "50%",
            }}
          >
            🛡️
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
            QuickPrint Admin Portal
          </h2>
          <p className="text-muted" style={{ fontSize: "0.85rem" }}>
            Restricted access for system administrators &amp; campus operations.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
              Administrator Passphrase
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                className="input"
                style={{ width: "100%", padding: "10px 44px 10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", boxSizing: "border-box" }}
                placeholder="••••••••••••"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "#94a3b8",
                  fontSize: "1rem",
                  lineHeight: 1,
                }}
                tabIndex={-1}
                aria-label={showPass ? "Hide passphrase" : "Show passphrase"}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "10px 16px",
              fontWeight: 600,
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            }}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Login to Admin Console →"}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #e2e8f0", textAlign: "center" }}>
          <button
            onClick={() => navigate("/")}
            className="btn btn-gray"
            style={{ fontSize: "0.8rem", width: "100%" }}
          >
            ← Back to Customer Login
          </button>
        </div>
      </div>
    </div>
  );
}
