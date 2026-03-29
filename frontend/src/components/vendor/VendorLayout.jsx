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
    toast.success("Logged out");
    navigate("/vendor/login");
  };

  return (
    <div className="vendor-layout">
      {/* Sidebar */}
      <aside className="vendor-sidebar">
        <div className="sidebar-logo">🖨️ QuickPrint</div>
        <div style={{ padding: "0 20px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{vendorData.shopName}</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 2 }}>{vendorData.name}</div>
        </div>

        {NAV_LINKS.map((l) => (
          <button
            key={l.path}
            className={`sidebar-link ${location.pathname === l.path ? "active" : ""}`}
            onClick={() => navigate(l.path)}
          >
            {l.label}
          </button>
        ))}

        <div style={{ marginTop: "auto", padding: "20px 20px 0" }}>
          <button
            className="sidebar-link"
            onClick={handleLogout}
            style={{ color: "#fca5a5", width: "100%" }}
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
