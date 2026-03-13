// src/pages/AdminDashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import NavBar from "../components/NavBar"; // ensure NavBar import

export default function AdminDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [shopOpen, setShopOpen] = useState(true);

  // Fetch orders every 5 seconds
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get("http://localhost:5000/queue");
        setOrders(res.data);
      } catch (err) {
        console.error("Fetch orders error:", err.response?.data || err.message);
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Toggle shop open/close
  const toggleShop = async () => {
    try {
      const newStatus = !shopOpen;
      setShopOpen(newStatus);
      await axios.post("http://localhost:5000/shop-status", { open: newStatus });
    } catch (err) {
      console.error("Toggle shop error:", err.response?.data || err.message);
    }
  };

  // Update order status
  const updateStatus = async (orderId, status) => {
    try {
      const res = await axios.patch(`http://localhost:5000/orders/${orderId}`, { status });
      // Update local state with updated order
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status: res.data.status } : o))
      );
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
    }
  };

  const activeOrders = orders.filter((o) => o.status !== "Completed");
  const completedOrders = orders.filter((o) => o.status === "Completed");

  return (
    <div>
      {user && <NavBar user={user} />}

      <div className="page-wrapper">
        <div className="card">
          <h2>Admin Dashboard</h2>

          {/* Shop Start/Stop */}
          <button
            onClick={toggleShop}
            style={{
              background: shopOpen ? "#10b981" : "#ef4444",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            {shopOpen ? "Shop Open (Stop)" : "Shop Closed (Start)"}
          </button>

          {/* Active Orders */}
          <h3>Active Orders ({activeOrders.length})</h3>
          <div className="orders-list">
            {activeOrders.length === 0 && <div className="small-muted">No active orders</div>}
            {activeOrders.map((o) => (
              <div key={o.orderId} className="order-item space-between">
                <div>
                  <b>#{o.orderId}</b> {o.serviceType} • {o.quantity} files
                  <div className="small-muted">{o.userId}</div>
                  {o.fileUrl && (
                    <div className="small-muted">
                      <a href={o.fileUrl} target="_blank" rel="noreferrer">
                        View File
                      </a>
                    </div>
                  )}
                  {o.instructions && <div className="small-muted">Msg: {o.instructions}</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {o.status !== "In Progress" && (
                    <button
                      className="btn-primary"
                      onClick={() => updateStatus(o.orderId, "In Progress")}
                    >
                      Start
                    </button>
                  )}
                  <button
                    className="btn-ghost"
                    onClick={() => updateStatus(o.orderId, "Completed")}
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Completed Orders */}
          <h3 style={{ marginTop: 24 }}>Completed Orders ({completedOrders.length})</h3>
          <div className="orders-list">
            {completedOrders.length === 0 && <div className="small-muted">No completed orders</div>}
            {completedOrders.map((o) => (
              <div key={o.orderId} className="order-item space-between">
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {o.serviceType} • {o.quantity} files
                  </div>
                  <div className="small-muted">{o.userId}</div>
                  {o.fileUrl && (
                    <div className="small-muted">
                      <a href={o.fileUrl} target="_blank" rel="noreferrer">
                        View File
                      </a>
                    </div>
                  )}
                  {o.instructions && <div className="small-muted">Msg: {o.instructions}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>₹{o.estimatedPrice}</div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#eef2ff",
                        color: "#1e3a8a",
                      }}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}