import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function UserNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    toast.success("Logged out");
    navigate("/");
  };

  const links = [
    { label: "📤 Upload", path: "/upload" },
    { label: "📦 My Orders", path: "/my-orders" },
    { label: "🛡️ Admin", path: "/admin" },
  ];

  return (
    <nav className="navbar">
      <span className="navbar-brand">🖨️ QuickPrint</span>
      <div className="navbar-actions">
        {links.map((l) => (
          <button
            key={l.path}
            onClick={() => navigate(l.path)}
            style={{
              background: location.pathname === l.path ? "rgba(255,255,255,0.15)" : "transparent",
              border: "none",
              color: "white",
              padding: "6px 14px",
              borderRadius: 6,
              fontFamily: "inherit",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {l.label}
          </button>
        ))}
        <span className="text-muted" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
          {user?.displayName || user?.email}
        </span>
        <button className="btn btn-gray" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
