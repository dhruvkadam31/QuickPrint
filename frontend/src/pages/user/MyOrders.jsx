import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserOrders } from "../../services/api";
import socket from "../../services/socket";
import UserNavbar from "../../components/user/UserNavbar";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  Queued:    { badge: "badge-queued",   icon: "⏳", label: "Queued" },
  Printing:  { badge: "badge-printing", icon: "🖨️", label: "Printing" },
  Ready:     { badge: "badge-ready",    icon: "✅", label: "Ready for Pickup" },
  "Picked Up": { badge: "badge-pickedup", icon: "📦", label: "Picked Up" },
};

const TABS = ["active", "completed", "all"];

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

  const fetchOrders = async () => {
    try {
      const res = await getUserOrders(user.uid);
      setOrders(res.data);
    } catch {
      toast.error("Could not load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Listen for real-time order updates
    socket.on("order-updated", ({ orderId, status }) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.orderId === orderId) {
            if (status === "Ready") toast.success("🎉 Your order is ready for pickup!");
            return { ...o, status };
          }
          return o;
        })
      );
    });

    return () => socket.off("order-updated");
  }, [user.uid]);

  const filtered =
    tab === "active"
      ? orders.filter((o) => o.status !== "Picked Up")
      : tab === "completed"
      ? orders.filter((o) => o.status === "Picked Up")
      : orders;

  const activeCount = orders.filter((o) => o.status !== "Picked Up").length;
  const readyCount = orders.filter((o) => o.status === "Ready").length;

  return (
    <>
      <UserNavbar />
      <div className="page">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--warning)" }}>{activeCount}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--success)" }}>{readyCount}</div>
            <div className="stat-label">Ready</div>
          </div>
        </div>

        <div className="card">
          <div className="flex-between mb-16">
            <h3>My Orders</h3>
            <button className="btn btn-gray" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={fetchOrders}>
              🔄 Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "active" && ` (${activeCount})`}
              </button>
            ))}
          </div>

          {loading && <p className="text-muted text-center">Loading orders...</p>}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
              <p className="text-muted">No orders found</p>
            </div>
          )}

          {filtered.map((o) => {
            const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.Queued;
            return (
              <div key={o.orderId} className="order-item">
                <div className="flex-between mb-8">
                  <div>
                    <span style={{ fontWeight: 700 }}>
                      {sc.icon} {o.serviceType}
                    </span>
                    <span className="text-muted" style={{ marginLeft: 8 }}>
                      {o.quantity} copies · {o.totalPages} pages · {o.color}
                    </span>
                  </div>
                  <span className={`badge ${sc.badge}`}>{sc.label}</span>
                </div>

                <div className="flex-between">
                  <div>
                    <div className="text-muted">🏪 {o.vendorName}</div>
                    <div className="text-muted" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                      #{o.orderCode || o.orderId.slice(-4)} · {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--brand)" }}>₹{o.estimatedPrice}</div>
                </div>

                {/* Ready — show OTP reminder */}
                {o.status === "Ready" && (
                  <div style={{ background: "var(--success-light)", border: "1.5px solid var(--success)", borderRadius: 8, padding: 12, marginTop: 12 }}>
                    <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 4 }}>🎉 Ready for pickup!</div>
                    <div style={{ fontSize: "0.85rem", color: "#065f46" }}>
                        Show this OTP: <strong>{o.otp}</strong>                    </div>
                  </div>
                )}

                {/* Printing — show progress */}
                {o.status === "Printing" && (
                  <div style={{ background: "var(--warning-light)", border: "1.5px solid var(--warning)", borderRadius: 8, padding: 12, marginTop: 12, fontSize: "0.85rem", color: "#92400e" }}>
                    🖨️ Currently being printed...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
