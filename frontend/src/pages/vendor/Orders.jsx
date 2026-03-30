import { useEffect, useState } from "react";
import VendorLayout from "../../components/vendor/VendorLayout";
import { getVendorOrders, updateOrderStatus } from "../../services/api";
import socket from "../../services/socket";
import toast from "react-hot-toast";

const TABS = ["Queued", "Printing", "Ready", "Picked Up"];

// 🔥 Clean print instructions block for vendor
function PrintInstructions({ order }) {
  const cfg = order.printConfig;

  // Fallback to legacy fields if printConfig not present
  const pages = cfg
    ? cfg.pageOption === "Custom"
      ? cfg.customPages || "Custom"
      : `All (${order.pageCount})`
    : `All (${order.pageCount})`;

  const pagesPerSheet = cfg?.pagesPerSheet ?? 1;
  const copies = cfg?.copies ?? order.quantity;
  const color = cfg?.color ?? order.color;
  const sides = cfg?.sides ?? order.sides;
  const orientation = cfg?.orientation ?? order.orientation;

  return (
    <div
      style={{
        background: "#f8faff",
        border: "1.5px solid #c7d8fa",
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 12,
        fontFamily: "monospace",
        fontSize: "0.9rem",
        lineHeight: 1.8,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "0.78rem", letterSpacing: 1, color: "#6b7280", marginBottom: 8, textTransform: "uppercase" }}>
        🖨️ Print Instructions
      </div>
      <div>• <strong>Pages:</strong> {pages}</div>
      <div>• <strong>Pages/Sheet:</strong> {pagesPerSheet}</div>
      <div>• <strong>Copies:</strong> {copies}</div>
      <div>• <strong>Color:</strong> {color}</div>
      <div>• <strong>Sides:</strong> {sides}</div>
      <div>• <strong>Orientation:</strong> {orientation}</div>
      {order.instructions ? (
        <div>• <strong>Note:</strong> {order.instructions}</div>
      ) : null}
    </div>
  );
}

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
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("click", unlockAudio);
  }, []);

  useEffect(() => {
    fetchOrders();

    socket.on("order-created", () => {
      console.log("ORDER CREATED EVENT RECEIVED");
      fetchOrders();

      try {
        const audio = new Audio("/notification.mp3");
        audio.volume = 1;
        audio.play().catch(() => {
          console.log("🔇 Sound blocked until user interacts");
        });
      } catch (e) {
        console.log("Audio error", e);
      }

      toast.success("🆕 New order received!");

      try {
        if (Notification.permission === "granted") {
          const notification = new Notification("🖨️ New Print Order!", {
            body: "Check your dashboard",
            icon: "/vite.svg",
          });
          setTimeout(() => notification.close(), 4000);
        }
      } catch (err) {
        console.log("Notification error:", err);
      }
    });

    socket.on("order-updated", fetchOrders);

    return () => {
      socket.off("order-created");
      socket.off("order-updated");
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

          {/* Header: Order Code + User + Time */}
          <div className="flex-between mb-8">
            <div>
              <span className="fw-700" style={{ fontSize: "1.05rem" }}>
                #{order.orderCode || order.orderId.slice(-4)}
              </span>
              {order.userName && (
                <span className="text-muted" style={{ fontSize: "0.85rem", marginLeft: 8 }}>
                  · {order.userName}
                </span>
              )}
            </div>
            <span className="text-muted" style={{ fontSize: "0.8rem" }}>
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>

          {/* 🔥 Clean Print Instructions Block */}
          <PrintInstructions order={order} />

          {/* Price + Service */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: "0.85rem" }}>
            <span style={{ background: "var(--brand-light)", color: "var(--brand)", borderRadius: 6, padding: "3px 10px", fontWeight: 600 }}>
              {order.serviceType}
            </span>
            <span style={{ background: "var(--gray-100)", borderRadius: 6, padding: "3px 10px", fontWeight: 600 }}>
              ₹{order.estimatedPrice}
            </span>
          </div>

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