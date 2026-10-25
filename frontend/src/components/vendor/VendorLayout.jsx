import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { vendorLogout } from "../../services/api";
import socket from "../../services/socket";
import toast from "react-hot-toast";

const NAV_LINKS = [
  { label: "📊 Dashboard", path: "/vendor/dashboard" },
  { label: "📦 Orders", path: "/vendor/orders" },
  { label: "🔑 Pickup / OTP", path: "/vendor/pickup" },
  { label: "⚙️ Settings", path: "/vendor/settings" },
];

export default function VendorLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const vendorData = JSON.parse(localStorage.getItem("vendorData") || "{}");

  const handleLogout = async () => {
    try {
      socket.emit("vendor-offline", vendorData.vendorId);
      await vendorLogout({ vendorId: vendorData.vendorId });
    } catch {}
    localStorage.removeItem("vendorToken");
    localStorage.removeItem("vendorData");
    setSidebarOpen(false);
    toast.success("Logged out");
    navigate("/vendor/login");
  };

  const handleNavClick = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="vendor-layout">
      {/* Mobile Top Header */}
      <header className="vendor-mobile-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="vendor-mobile-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open vendor menu"
          >
            ☰
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.2 }}>
              🖨️ QuickPrint
            </div>
            <div style={{ fontSize: "0.75rem", opacity: 0.8, marginTop: 2 }}>
              {vendorData.shopName || "Vendor Portal"}
            </div>
          </div>
        </div>
        <button
          className="btn btn-gray"
          style={{ fontSize: "0.78rem", padding: "4px 10px", minHeight: 32 }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      {/* Mobile Backdrop Overlay */}
      <div
        className={`vendor-mobile-backdrop ${sidebarOpen ? "mobile-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar Drawer */}
      <aside className={`vendor-sidebar ${sidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-logo">
          <span>🖨️ QuickPrint</span>
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close vendor menu"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "0 20px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            {vendorData.shopName || "My Print Shop"}
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 2 }}>
            {vendorData.name || "Vendor"}
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column" }}>
          {NAV_LINKS.map((l) => (
            <button
              key={l.path}
              className={`sidebar-link ${location.pathname === l.path ? "active" : ""}`}
              onClick={() => handleNavClick(l.path)}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: "auto", padding: "20px 20px" }}>
          <button
            className="sidebar-link"
            onClick={handleLogout}
            style={{ color: "#fca5a5", width: "100%", borderRadius: 6 }}
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="vendor-content">{children}</main>
    </div>
  );
}
