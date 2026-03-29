import { useEffect, useState } from "react";
import VendorLayout from "../../components/vendor/VendorLayout";
import { getVendorOrders, updateOrderStatus } from "../../services/api";
import socket from "../../services/socket";
import toast from "react-hot-toast";

const TABS = ["Queued", "Printing", "Ready", "Picked Up"];

export default function VendorOrders() {
  const vendorData = JSON.parse(localStorage.getItem("vendorData") || "{}");
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("Queued");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await getVendorOrders(vendorData.vendorId);
      setOrders(res.data);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    socket.on("order-created", fetchOrders);
    socket.on("order-updated", fetchOrders);
    return () => {
      socket.off("order-created", fetchOrders);
      socket.off("order-updated", fetchOrders);
    };
  }, []);

  const handleStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order marked as ${newStatus}`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = orders.filter((o) => o.status === tab);

  const countFor = (status) => orders.filter((o) => o.status === status).length;

  return (
    <VendorLayout>
      <div className="flex-between mb-16">
        <h2>Orders</h2>
        <button className="btn btn-gray" style={{ fontSize: "0.8rem" }} onClick={fetchOrders}>
          🔄 Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t} ({countFor(t)})
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">Loading orders...</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
          <p className="text-muted">No {tab.toLowerCase()} orders</p>
        </div>
      )}

      {filtered.map((order) => (
        <div key={order.orderId} className="order-item">
          {/* Header */}
          <div className="flex-between mb-8">
            <span className="fw-700">#{order.orderCode || order.orderId.slice(-4)}</span>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>

          {/* Print config */}
          <div style={{ background: "var(--gray-50)", borderRadius: 8, padding: 12, marginBottom: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: "0.85rem" }}>
            <div><span className="text-muted">Service:</span> <strong>{order.serviceType}</strong></div>
            <div><span className="text-muted">Copies:</span> <strong>{order.quantity}</strong></div>
            <div><span className="text-muted">Pages:</span> <strong>{order.totalPages}</strong></div>
            <div><span className="text-muted">Color:</span> <strong>{order.color}</strong></div>
            <div><span className="text-muted">Sides:</span> <strong>{order.sides}</strong></div>
            <div><span className="text-muted">Price:</span> <strong style={{ color: "var(--brand)" }}>₹{order.estimatedPrice}</strong></div>
          </div>

          {order.instructions && (
            <div style={{ background: "var(--warning-light)", borderRadius: 6, padding: "8px 12px", fontSize: "0.85rem", color: "#92400e", marginBottom: 12 }}>
              📝 <strong>Instructions:</strong> {order.instructions}
            </div>
          )}

          {/* File link */}
          <div style={{ marginBottom: 12 }}>
            <a
              href={order.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ fontSize: "0.85rem", padding: "6px 12px" }}
            >
              📄 View / Download File
            </a>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            {order.status === "Queued" && (
              <button
                className="btn btn-primary"
                disabled={updating === order.orderId}
                onClick={() => handleStatus(order.orderId, "Printing")}
              >
                {updating === order.orderId ? "..." : "🖨️ Start Printing"}
              </button>
            )}
            {order.status === "Printing" && (
              <button
                className="btn btn-success"
                disabled={updating === order.orderId}
                onClick={() => handleStatus(order.orderId, "Ready")}
              >
                {updating === order.orderId ? "..." : "✅ Mark as Ready"}
              </button>
            )}
            {order.status === "Ready" && (
              <div className="badge badge-ready" style={{ padding: "8px 14px" }}>
                ✅ Awaiting Pickup
              </div>
            )}
            {order.status === "Picked Up" && (
              <div className="badge badge-pickedup" style={{ padding: "8px 14px" }}>
                📦 Completed
              </div>
            )}
          </div>
        </div>
      ))}
    </VendorLayout>
  );
}
