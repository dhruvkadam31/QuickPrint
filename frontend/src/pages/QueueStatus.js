// src/pages/QueueStatus.js
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function QueueStatus() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await axios.get("http://localhost:5000/queue");
        setQueue(res.data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Queue fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Printing":
        return <span className="badge badge-warning" style={{ animation: "pulse 2s infinite" }}>🖨️ Printing</span>;
      case "Ready for Pickup":
      case "Ready":
        return <span className="badge badge-success">✅ Ready for Pickup</span>;
      case "Queued":
        return <span className="badge badge-info">⏱️ In Queue</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="page-wrapper">
      <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--slate-900)", margin: "0 0 4px 0" }}>
              📊 Live Campus Queue Status
            </h2>
            <p className="small-muted" style={{ margin: 0 }}>
              Real-time monitor of active document print queues across shops
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--slate-500)", background: "var(--slate-100)", padding: "6px 12px", borderRadius: "20px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22C55E", display: "inline-block" }}></span>
            Live (Updated: {lastUpdated.toLocaleTimeString()})
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div className="spinner" style={{ margin: "0 auto 12px auto", width: 28, height: 28 }}></div>
            <p className="small-muted">Connecting to queue monitor...</p>
          </div>
        ) : queue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--slate-50)", borderRadius: "12px", border: "1px dashed var(--slate-300)" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
            <h4 style={{ fontSize: "16px", fontWeight: "600", color: "var(--slate-800)", marginBottom: "4px" }}>
              Queue is Empty!
            </h4>
            <p className="small-muted" style={{ margin: 0 }}>
              No documents currently waiting in line. Orders placed now will print instantly!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {queue.map((o, idx) => (
              <div
                key={o.orderId || o.id || idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  background: idx === 0 ? "linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)" : "#FFFFFF",
                  border: idx === 0 ? "1px solid var(--indigo-200)" : "1px solid var(--slate-200)",
                  borderRadius: "12px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: idx === 0 ? "var(--indigo-600)" : "var(--slate-100)",
                      color: idx === 0 ? "#FFFFFF" : "var(--slate-700)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "15px"
                    }}
                  >
                    #{idx + 1}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "700", color: "var(--slate-900)", fontFamily: "monospace" }}>
                        {o.orderId || o.id}
                      </span>
                      {o.vendorName && (
                        <span style={{ fontSize: "12px", background: "var(--slate-100)", padding: "2px 8px", borderRadius: "4px", color: "var(--slate-600)" }}>
                          🏪 {o.vendorName}
                        </span>
                      )}
                    </div>
                    <div className="small-muted" style={{ fontSize: "13px" }}>
                      📄 {o.serviceType || "Document Print"} • {o.totalPages || o.pageCount || 1} pages • Submitted: {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  {getStatusBadge(o.status)}
                  {o.estimatedWaitTime && (
                    <div style={{ fontSize: "12px", color: "var(--slate-500)", marginTop: "4px" }}>
                      Est. Wait: {o.estimatedWaitTime}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}