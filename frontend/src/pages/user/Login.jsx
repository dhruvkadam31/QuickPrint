import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../../firebase";
import toast from "react-hot-toast";

export default function UserLogin() {
  const [tab, setTab] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        toast.success("Account created! Welcome 🎉");
        navigate("/upload");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back!");
        navigate("/upload");
      }
    } catch (err) {
      toast.error(err.message.replace("Firebase: ", "").replace(/\(auth.*\)/, "").trim());
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

          {tab === "signup" && (
            <div className="form-group">
              <label className="input-label">Confirm Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={loading}
              />
            </div>
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
      </div>
    </div>
  );
}
