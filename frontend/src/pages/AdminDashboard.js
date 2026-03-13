import React, { useEffect, useState } from "react";
import axios from "axios";
import NavBar from "../components/NavBar";
import { toast } from "react-toastify";

const API_URL = "http://localhost:5000/api";

export default function AdminDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [shopOpen, setShopOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    queued: 0,
    inProgress: 0,
    completed: 0,
    revenue: 0
  });

  // Fetch orders every 5 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch shop status
  useEffect(() => {
    fetchShopStatus();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders/queue`);
      setOrders(res.data);
      calculateStats(res.data);
    } catch (err) {
      console.error("Fetch orders error:", err);
    }
  };

  const fetchShopStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/shop-status`);
      setShopOpen(res.data.open);
    } catch (err) {
      console.error("Fetch shop status error:", err);
    }
  };

  const calculateStats = (ordersData) => {
    const queued = ordersData.filter(o => o.status === "Queued").length;
    const inProgress = ordersData.filter(o => o.status === "In Progress").length;
    const completed = ordersData.filter(o => o.status === "Completed").length;
    const revenue = ordersData
      .filter(o => o.status === "Completed")
      .reduce((sum, o) => sum + (o.estimatedPrice || 0), 0);

    setStats({
      total: ordersData.length,
      queued,
      inProgress,
      completed,
      revenue
    });
  };

  const toggleShop = async () => {
    try {
      const newStatus = !shopOpen;
      await axios.post(`${API_URL}/shop-status`, { open: newStatus });
      setShopOpen(newStatus);
      toast.success(`Shop is now ${newStatus ? 'open' : 'closed'}`);
    } catch (err) {
      console.error("Toggle shop error:", err);
      toast.error("Failed to update shop status");
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      setLoading(true);
      await axios.patch(`${API_URL}/orders/${orderId}`, { status });
      
      // Update local state
      setOrders(prev =>
        prev.map(o => o.orderId === orderId ? { ...o, status } : o)
      );
      
      toast.success(`Order #${orderId.slice(-6)} marked as ${status}`);
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update order status");
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => o.status !== "Completed");
  const completedOrders = orders.filter(o => o.status === "Completed");

  const getStatusBadge = (status) => {
    const classes = {
      "Queued": "badge queued",
      "In Progress": "badge progress",
      "Completed": "badge completed"
    };
    return classes[status] || "badge";
  };

  return (
    <div>
      {user && <NavBar user={user} isAdmin={true} />}

      <div className="page-wrapper">
        <div className="card">
          <div className="space-between" style={{ marginBottom: 24 }}>
            <h2>🖥️ Admin Dashboard</h2>
            
            <button
              onClick={toggleShop}
              className={shopOpen ? "shop-open-btn" : "shop-closed-btn"}
            >
              {shopOpen ? "🟢 Shop Open" : "🔴 Shop Closed"}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.queued}</div>
              <div className="stat-label">Queued</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.inProgress}</div>
              <div className="stat-label">In Progress</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">₹{stats.revenue}</div>
              <div className="stat-label">Revenue</div>
            </div>
          </div>

          {/* Active Orders */}
          <h3>📋 Active Orders ({activeOrders.length})</h3>
          <div className="orders-list">
            {activeOrders.length === 0 ? (
              <div className="empty-state">
                <p>No active orders</p>
                <p className="small-muted">Queue is empty</p>
              </div>
            ) : (
              activeOrders.map((o, index) => (
                <div key={o.orderId} className="order-item">
                  <div className="space-between">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span className="position-badge">#{index + 1}</span>
                        <span className={getStatusBadge(o.status)}>{o.status}</span>
                      </div>
                      <div style={{ fontWeight: 700 }}>Order #{o.orderId.slice(-8)}</div>
                      <div className="small-muted">
                        {o.serviceType} • {o.quantity} copy • {o.totalPages} pages
                      </div>
                      <div className="small-muted">Customer: {o.userId?.slice(0, 8)}...</div>
                      {o.instructions && (
                        <div className="instruction-bubble">
                          💬 {o.instructions}
                        </div>
                      )}
                      {o.fileUrl && (
                        <div className="small-muted">
                          <a href={o.fileUrl} target="_blank" rel="noreferrer">
                            📎 View File
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1em' }}>₹{o.estimatedPrice}</div>
                      {o.status !== "In Progress" && (
                        <button
                          className="btn-primary"
                          onClick={() => updateStatus(o.orderId, "In Progress")}
                          disabled={loading}
                          style={{ padding: '8px 12px' }}
                        >
                          Start
                        </button>
                      )}
                      <button
                        className="btn-success"
                        onClick={() => updateStatus(o.orderId, "Completed")}
                        disabled={loading}
                        style={{ padding: '8px 12px' }}
                      >
                        Complete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Completed Orders */}
          {completedOrders.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>✅ Completed Orders ({completedOrders.length})</h3>
              <div className="orders-list">
                {completedOrders.map((o) => (
                  <div key={o.orderId} className="order-item completed">
                    <div className="space-between">
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          {o.serviceType} • {o.quantity} copy
                        </div>
                        <div className="small-muted">Order #{o.orderId.slice(-8)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700 }}>₹{o.estimatedPrice}</div>
                        <span className="badge completed">Completed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}