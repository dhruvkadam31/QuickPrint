import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function UserNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkAuth } = useAuth();

  const handleLogout = async () => {
    localStorage.removeItem("userToken");
    await checkAuth(); // Trigger context update
    toast.success("Logged out");
    setMobileMenuOpen(false);
    navigate("/");
  };

  const links = [
    { label: "📤 Upload", path: "/upload" },
    { label: "📦 My Orders", path: "/my-orders" },
  ];

  const handleNavClick = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <span className="navbar-brand" onClick={() => navigate("/upload")}>
          🖨️ QuickPrint
        </span>

        {/* Desktop Navigation */}
        <div className="navbar-actions">
          {links.map((l) => (
            <button
              key={l.path}
              onClick={() => handleNavClick(l.path)}
              style={{
                background: location.pathname === l.path ? "rgba(255,255,255,0.18)" : "transparent",
                border: "none",
                color: "white",
                padding: "8px 14px",
                borderRadius: 6,
                fontFamily: "inherit",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              {l.label}
            </button>
          ))}
          <span
            className="text-muted"
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: "0.82rem",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={user?.displayName || user?.email}
          >
            {user?.displayName || user?.email}
          </span>
          <button
            className="btn btn-gray"
            style={{ fontSize: "0.8rem", padding: "6px 12px", minHeight: 32 }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {/* Mobile Dropdown Menu */}
      <div className={`navbar-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((l) => (
            <button
              key={l.path}
              onClick={() => handleNavClick(l.path)}
              style={{
                background: location.pathname === l.path ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                border: "none",
                color: "white",
                padding: "12px 16px",
                borderRadius: 8,
                fontFamily: "inherit",
                fontSize: "0.95rem",
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: 12,
            marginTop: 4,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "0.85rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "60%",
            }}
          >
            {user?.displayName || user?.email}
          </span>
          <button
            className="btn btn-gray"
            style={{ fontSize: "0.82rem", padding: "6px 14px", minHeight: 36 }}
            onClick={handleLogout}
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </>
  );
}
