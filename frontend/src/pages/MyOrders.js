import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = "http://localhost:5000/api";

export default function MyOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/orders/${user.uid}`);
      setOrders(res.data);
    } catch (err) {
      console.error("Fetch orders error:", err);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const filtered = () => {
    if (tab === "active") {
      return orders.filter((o) => o.status !== "Completed");
    } else if (tab === "completed") {
      return orders.filter((o) => o.status === "Completed");
    }
    return orders;
  };

  const getStatusBadge = (status) => {
    const classes = {
      "Queued": "badge queued",
      "In Progress": "badge progress",
      "Completed": "badge completed"
    };
    return classes[status] || "badge";
  };

  const activeCount = orders.filter(o => o.status !== "Completed").length;
  const completedCount = orders.filter(o => o.status === "Completed").length;

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="card">
          <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 20 }}></div>
          <div className="skeleton" style={{ height: 60, marginBottom: 10 }}></div>
          <div className="skeleton" style={{ height: 60, marginBottom: 10 }}></div>
          <div className="skeleton" style={{ height: 60 }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="card">
        <h3>📦 My Orders</h3>
        
        <div className="tabs" style={{ marginTop: 16 }}>
          <button 
            className={`tab-btn ${tab === "active" ? "active" : ""}`}
            onClick={() => setTab("active")}
          >
            Active ({activeCount})
          </button>
          <button 
            className={`tab-btn ${tab === "completed" ? "active" : ""}`}
            onClick={() => setTab("completed")}
          >
            Completed ({completedCount})
          </button>
          <button 
            className={`tab-btn ${tab === "all" ? "active" : ""}`}
            onClick={() => setTab("all")}
          >
            All ({orders.length})
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          {filtered().length === 0 ? (
            <div className="empty-state">
              <p>No orders found</p>
              <p className="small-muted">
                {tab === "active" ? "You have no active orders" : 
                 tab === "completed" ? "No completed orders yet" : 
                 "Start by uploading a file"}
              </p>
            </div>
          ) : (
            filtered().map((o) => (
              <div key={o.orderId} className="order-item">
                <div className="space-between">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span className={getStatusBadge(o.status)}>{o.status}</span>
                      <span className="small-muted">#{o.orderId?.slice(-8)}</span>
                    </div>
                    <div>
                      <strong>{o.serviceType}</strong> • {o.quantity} copy
                    </div>
                    <div className="small-muted">
                      {o.totalPages} pages • {o.color} • {o.sides}-sided
                    </div>
                    <div className="small-muted">
                      {new Date(o.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    {o.instructions && (
                      <div className="instruction-bubble">
                        💬 {o.instructions}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: '1.2em' }}>₹{o.estimatedPrice}</div>
                    {o.fileUrl && (
                      <a 
                        href={o.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="small-muted"
                        style={{ display: 'block', marginTop: 8 }}
                      >
                        📎 View File
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}