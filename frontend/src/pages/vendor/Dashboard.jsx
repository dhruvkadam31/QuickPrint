import { useEffect, useState } from "react";
import VendorLayout from "../../components/vendor/VendorLayout";
import {
  getVendorOrders,
  getVendorRevenue,
  toggleShopStatus,
  getDemandPrediction,
} from "../../services/api";
import socket from "../../services/socket";
import toast from "react-hot-toast";

export default function VendorDashboard() {
  const vendorData = JSON.parse(localStorage.getItem("vendorData") || "{}");
  const [orders, setOrders] = useState([]);
  const [revenue, setRevenue] = useState({
    today: { total: 0, ordersCount: 0, net: 0 },
  });
  const [shopOpen, setShopOpen] = useState(vendorData.shopOpen ?? true);
  const [loading, setLoading] = useState(true);
  const [demandForecast, setDemandForecast] = useState(null);

  const fetchAll = async () => {
    try {
      const [ordRes, revRes, demandRes] = await Promise.all([
        getVendorOrders(vendorData.vendorId),
        getVendorRevenue(vendorData.vendorId),
        getDemandPrediction({ vendorId: vendorData.vendorId }),
      ]);
      setOrders(ordRes.data);
      setRevenue(revRes.data);
      setDemandForecast(demandRes.data.ml_response);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    const vendor = JSON.parse(localStorage.getItem("vendorData"));
    socket.emit("vendor-online", vendor.vendorId);

    socket.on("order-created", () => {
      console.log("ORDER CREATED EVENT RECEIVED");
      toast("📦 New order received!", { icon: "🔔" });
      fetchAll();
    });

    socket.on("order-updated", () => fetchAll());

    return () => {
      socket.off("order-created");
      socket.off("order-updated");
    };
  }, []);

  const handleToggleShop = async () => {
    try {
      const newStatus = !shopOpen;
      await toggleShopStatus(vendorData.vendorId, newStatus);
      setShopOpen(newStatus);
      const updated = { ...vendorData, shopOpen: newStatus };
      localStorage.setItem("vendorData", JSON.stringify(updated));
      toast.success(`Shop is now ${newStatus ? "OPEN 🟢" : "CLOSED 🔴"}`);
    } catch {
      toast.error("Failed to toggle shop status");
    }
  };

  const queued = orders.filter((o) => o.status === "Queued").length;
  const printing = orders.filter((o) => o.status === "Printing").length;
  const ready = orders.filter((o) => o.status === "Ready").length;
  const recentOrders = orders.slice(0, 5);

  return (
    <VendorLayout>
      <button
        onClick={async () => {
          await Notification.requestPermission();

          const audio = new Audio("/notification.mp3");
          audio.play().catch(() => {});

          toast.success("Notifications enabled 🔔");
        }}
      >
        Enable Alerts
      </button>

      <div className="flex-between mb-16">
        <div>
          <h2 style={{ marginBottom: 2 }}>Dashboard</h2>
          <p className="text-muted">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {/* Shop Toggle */}
        <button
          onClick={handleToggleShop}
          className={`btn shop-toggle ${
            shopOpen ? "shop-open" : "shop-closed"
          }`}
        >
          {shopOpen ? "🟢 Shop Open" : "🔴 Shop Closed"}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">
            ₹{revenue.today?.total?.toFixed(0) || 0}
          </div>
          <div className="stat-label">Today's Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>
            ₹{revenue.today?.net?.toFixed(0) || 0}
          </div>
          <div className="stat-label">Net Earnings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--warning)" }}>
            {queued}
          </div>
          <div className="stat-label">In Queue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--brand)" }}>
            {printing}
          </div>
          <div className="stat-label">Printing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>
            {ready}
          </div>
          <div className="stat-label">Ready</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{revenue.today?.ordersCount || 0}</div>
          <div className="stat-label">Today's Orders</div>
        </div>
      </div>

      {demandForecast && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <h3 style={{ marginBottom: 14 }}>📈 Smart Demand Forecast</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--gray-500)",
                  marginBottom: 4,
                }}
              >
                Predicted Orders
              </div>

              <div
                style={{
                  fontSize: "1.8rem",
                  fontWeight: 700,
                  color: "var(--brand)",
                }}
              >
                {demandForecast.predicted_orders}
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "var(--gray-500)",
                  marginBottom: 4,
                }}
              >
                Demand Level
              </div>

              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "#b45309",
                }}
              >
                {demandForecast.demand_class}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Recommendation
            </div>

            <div
              style={{
                fontSize: "0.95rem",
                color: "var(--gray-700)",
              }}
            >
              {demandForecast.recommendation}
            </div>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Recent Orders</h3>
        {loading && <p className="text-muted">Loading...</p>}
        {!loading && recentOrders.length === 0 && (
          <p className="text-muted text-center" style={{ padding: 24 }}>
            No orders yet today
          </p>
        )}
        {recentOrders.map((o) => (
          <div key={o.orderId} className="order-item">
            <div className="flex-between">
              <div>
                <span className="fw-600">{o.serviceType}</span>
                <span className="text-muted" style={{ marginLeft: 8 }}>
                  {o.totalPages} pages · {o.color}
                </span>
                <div
                  className="text-muted"
                  style={{ fontSize: "0.8rem", marginTop: 2 }}
                >
                  {new Date(o.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="fw-700" style={{ color: "var(--brand)" }}>
                  ₹{o.estimatedPrice}
                </div>
                <span
                  className={`badge badge-${o.status
                    .toLowerCase()
                    .replace(" ", "")}`}
                  style={{ marginTop: 4 }}
                >
                  {o.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </VendorLayout>
  );
}
