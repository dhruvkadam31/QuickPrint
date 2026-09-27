import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getUserOrders, cancelOrder } from "../../services/api";
import socket from "../../services/socket";
import UserNavbar from "../../components/user/UserNavbar";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  Queued: { badge: "badge-queued", icon: "⏳", label: "Queued" },
  Printing: { badge: "badge-printing", icon: "🖨️", label: "Printing" },
  Ready: { badge: "badge-ready", icon: "✅", label: "Ready for Pickup" },
  "Picked Up": { badge: "badge-pickedup", icon: "📦", label: "Picked Up" },
  Cancelled: { badge: "badge-danger", icon: "❌", label: "Cancelled" },
};

const TABS = ["active", "completed", "cancelled", "all"];

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

  // Cancellation modal state
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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
    socket.on("order-updated", ({ orderId, status, order }) => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.orderId === orderId) {
            if (status === "Ready") toast.success("🎉 Your order is ready for pickup!");
            if (status === "Cancelled") toast.error("🛑 Order was cancelled");
            return order || { ...o, status };
          }
          return o;
        })
      );
    });

    return () => socket.off("order-updated");
  }, [user.uid]);

  const handleCancelClick = (order) => {
    setSelectedOrderToCancel(order);
    setCancelReason("Changed mind / Ordered by mistake");
  };

  const submitCancellation = async () => {
    if (!selectedOrderToCancel) return;
    setCancelling(true);
    try {
      const res = await cancelOrder(selectedOrderToCancel.orderId, {
        reason: cancelReason,
        userEmail: user?.email,
      });

      if (res.data.success) {
        toast.success("Order cancelled and refund initiated!");
        setOrders((prev) =>
          prev.map((o) =>
            o.orderId === selectedOrderToCancel.orderId
              ? { ...o, status: "Cancelled", cancellationReason: cancelReason, ...res.data.refundInfo }
              : o
          )
        );
        setSelectedOrderToCancel(null);
      }
    } catch (err) {
      toast.error("Cancellation failed: " + (err.response?.data?.error || err.message));
    } finally {
      setCancelling(false);
    }
  };

  const activeOrders = orders.filter((o) => !["Picked Up", "Cancelled"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "Picked Up");
  const cancelledOrders = orders.filter((o) => o.status === "Cancelled");

  const filtered =
    tab === "active"
      ? activeOrders
      : tab === "completed"
      ? completedOrders
      : tab === "cancelled"
      ? cancelledOrders
      : orders;

  const activeCount = activeOrders.length;
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
            <div className="stat-value" style={{ color: "var(--warning)" }}>
              {activeCount}
            </div>
            <div className="stat-label">Active In Queue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--success)" }}>
              {readyCount}
            </div>
            <div className="stat-label">Ready for Pickup</div>
          </div>
        </div>

        <div className="card">
          <div className="flex-between mb-16">
            <h3>My Orders</h3>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t}
                className={`tab-btn ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t === "active" && ` (${activeCount})`}
                {t === "cancelled" && ` (${cancelledOrders.length})`}
              </button>
            ))}
          </div>

          {loading && <p className="text-muted text-center">Loading orders...</p>}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📭</div>
              <p className="text-muted">No orders found in this section</p>
            </div>
          )}

          {filtered.map((o) => {
            const sc = STATUS_CONFIG[o.status] || STATUS_CONFIG.Queued;
            const canCancel = o.status === "Queued";

            return (
              <div key={o.orderId} className="order-item" style={{ position: "relative" }}>
                <div className="flex-between mb-8">
                  <div>
                    <span style={{ fontWeight: 700 }}>
                      {sc.icon} {o.serviceType}
                    </span>
                    <span className="text-muted" style={{ marginLeft: 8 }}>
                      {o.quantity} copies · {o.totalPages} pages · {o.color}
                    </span>
                  </div>
                  <span
                    className={`badge ${sc.badge}`}
                    style={
                      o.status === "Cancelled"
                        ? { background: "#fee2e2", color: "#dc2626", border: "1px solid #f87171" }
                        : {}
                    }
                  >
                    {sc.label}
                  </span>
                </div>

                <div className="flex-between">
                  <div>
                    <div className="text-muted">🏪 {o.vendorName}</div>
                    <div className="text-muted" style={{ fontSize: "0.78rem", marginTop: 2 }}>
                      #{o.orderCode || o.orderId.slice(-4)} · {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--brand)" }}>
                    ₹{o.estimatedPrice}
                  </div>
                </div>

                {/* Cancelled Notice */}
                {o.status === "Cancelled" && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginTop: 12,
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#991b1b" }}>
                      🛑 Order Cancelled: {o.cancellationReason || "By customer request"}
                    </div>
                    {o.refundId && (
                      <div style={{ color: "#166534", marginTop: 4, fontWeight: 500 }}>
                        💳 Safe Razorpay Refund ID: <code>{o.refundId}</code> (₹{o.refundAmount || o.estimatedPrice})
                      </div>
                    )}
                  </div>
                )}

                {/* Ready — show OTP reminder */}
                {o.status === "Ready" && (
                  <div
                    style={{
                      background: "var(--success-light)",
                      border: "1.5px solid var(--success)",
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 4 }}>
                      🎉 Ready for pickup!
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#065f46" }}>
                      Show this OTP to the print vendor: <strong>{o.otp}</strong>
                    </div>
                  </div>
                )}

                {/* Printing — show progress */}
                {o.status === "Printing" && (
                  <div
                    style={{
                      background: "var(--warning-light)",
                      border: "1.5px solid var(--warning)",
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 12,
                      fontSize: "0.85rem",
                      color: "#92400e",
                    }}
                  >
                    🖨️ Currently being printed by {o.vendorName}...
                  </div>
                )}

                {/* Cancellation action button */}
                {canCancel && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button
                      onClick={() => handleCancelClick(o)}
                      className="btn"
                      style={{
                        background: "#fff1f2",
                        color: "#e11d48",
                        border: "1px solid #fecdd3",
                        fontSize: "0.8rem",
                        padding: "6px 14px",
                        cursor: "pointer",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      🛑 Cancel Order & Refund
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancellation Modal */}
      {selectedOrderToCancel && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              margin: 16,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ marginBottom: 12, color: "#111827" }}>Cancel Order</h3>
            <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: 16 }}>
              Are you sure you want to cancel order <strong>#{selectedOrderToCancel.orderCode || selectedOrderToCancel.orderId.slice(-4)}</strong>? 
              A full refund of <strong>₹{selectedOrderToCancel.estimatedPrice}</strong> will be processed to your payment source.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6 }}>
                Reason for cancellation:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  fontSize: "0.9rem",
                }}
              >
                <option value="Changed mind / Ordered by mistake">Changed mind / Ordered by mistake</option>
                <option value="Estimated wait time is too long">Estimated wait time is too long</option>
                <option value="Wrong print configuration selected">Wrong print configuration selected</option>
                <option value="Uploaded wrong document">Uploaded wrong document</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                className="btn btn-gray"
                onClick={() => setSelectedOrderToCancel(null)}
                disabled={cancelling}
              >
                Keep Order
              </button>
              <button
                className="btn"
                onClick={submitCancellation}
                disabled={cancelling}
                style={{ background: "#dc2626", color: "#fff" }}
              >
                {cancelling ? "Processing Refund..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
