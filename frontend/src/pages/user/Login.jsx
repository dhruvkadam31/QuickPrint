import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { userRegister, userLogin } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function UserLogin() {
  const [tab, setTab] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tab === "signup") {
        if (password !== confirm) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }
        const res = await userRegister({ name, email, password });
        localStorage.removeItem("vendorToken");
        localStorage.removeItem("adminToken");
        localStorage.setItem("userToken", res.data.token);
        await checkAuth();
        toast.success("Account created! Welcome 🎉");
        navigate("/upload");
      } else {
        const res = await userLogin({ email, password });
        localStorage.removeItem("vendorToken");
        localStorage.removeItem("adminToken");
        localStorage.setItem("userToken", res.data.token);
        await checkAuth();
        toast.success("Welcome back!");
        navigate("/upload");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">🖨️ QuickPrint</div>
        <p className="auth-subtitle">Fast, reliable printing at your fingertips</p>

        {/* Tabs */}
        <div style={{ display: "flex", background: "var(--gray-100)", borderRadius: 8, padding: 4, marginBottom: 24 }}>
          {["signin", "signup"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                borderRadius: 6,
                fontFamily: "inherit",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.15s",
                background: tab === t ? "white" : "transparent",
                color: tab === t ? "var(--brand)" : "var(--gray-600)",
                boxShadow: tab === t ? "var(--shadow)" : "none",
              }}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {tab === "signup" && (
            <div className="form-group">
              <label className="input-label">Full Name</label>
              <input
                className="input"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="input-label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <PasswordField
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />

          {tab === "signup" && (
            <PasswordField
              label="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          )}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Please wait..." : tab === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <span className="text-muted">Are you a vendor? </span>
          <button
            className="btn btn-ghost"
            style={{ padding: "6px 14px", fontSize: "0.85rem" }}
            onClick={() => navigate("/vendor/login")}
          >
            Vendor Login →
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 10px", fontSize: "0.78rem", color: "var(--gray-400)" }}
            onClick={() => navigate("/admin/login")}
          >
            Admin Access
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reusable password field with eye toggle ──────────────────
function PasswordField({ label, value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div className="form-group">
      <label className="input-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className="input"
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          disabled={disabled}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            color: "var(--gray-400)",
            fontSize: "1rem",
            lineHeight: 1,
          }}
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}
