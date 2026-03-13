import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export default function QueueStatus() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await axios.get(`${API_URL}/orders/queue`);
        setQueue(res.data);
      } catch (err) {
        console.error("Fetch queue error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    const classes = {
      "Queued": "badge queued",
      "In Progress": "badge progress",
      "Completed": "badge completed"
    };
    return classes[status] || "badge";
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="card">
          <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 20 }}></div>
          <div className="skeleton" style={{ height: 60, marginBottom: 10 }}></div>
          <div className="skeleton" style={{ height: 60, marginBottom: 10 }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="card">
        <h3>🔄 Live Queue Status</h3>
        <p className="small-muted">Real-time updates on print queue</p>
        
        <div style={{ marginTop: 20 }}>
          {queue.length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize: 48, marginBottom: 8 }}>✅</p>
              <p>Queue is empty</p>
              <p className="small-muted">No pending orders</p>
            </div>
          ) : (
            <>
              <div className="queue-stats">
                <span>Total in queue: <strong>{queue.length}</strong></span>
                <span>Estimated wait: <strong>{queue.length * 5} mins</strong></span>
              </div>
              
              {queue.map((order, index) => (
                <div key={order.orderId} className="queue-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="position-indicator">#{index + 1}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {order.serviceType} • {order.quantity} copy
                      </div>
                      <div className="small-muted">
                        Order #{order.orderId?.slice(-8)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={getStatusBadge(order.status)}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}