// src/pages/QueueStatus.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const STATUS_META = {
  "Queued":      { badge: "badge-queued",   icon: "⏳", label: "Queued" },
  "In Progress": { badge: "badge-progress", icon: "🔄", label: "In Progress" },
  "Ready":       { badge: "badge-ready",    icon: "✅", label: "Ready" },
  "Picked Up":   { badge: "badge-done",     icon: "📦", label: "Picked Up" },
  "Completed":   { badge: "badge-done",     icon: "✔️", label: "Completed" },
};

export default function QueueStatus() {
  const [queue, setQueue]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("http://localhost:5000/queue");
        setQueue(res.data);
        setLastUpdated(new Date());
      } catch (e) {
        console.error("Queue fetch error:", e);
      } finally { setLoading(false); }
    };
    fetch();
    const iv = setInterval(fetch, 5000);
    return () => clearInterval(iv);
  }, []);

  const statusCounts = queue.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-wrapper">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2>Live Queue Status</h2>
          <p>Real-time updates · refreshes every 5 seconds</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s ease infinite" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Connecting…"}
          </span>
        </div>
      </div>

      {/* Stat row */}
      <div className="stat-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", marginBottom: 24 }}>
        {[
          { label: "Total",       value: queue.length,                          color: "var(--accent)" },
          { label: "Queued",      value: statusCounts["Queued"] || 0,           color: "var(--status-queued-text)" },
          { label: "In Progress", value: statusCounts["In Progress"] || 0,      color: "var(--status-progress-text)" },
          { label: "Ready",       value: statusCounts["Ready"] || 0,            color: "var(--status-ready-text)" },
          { label: "Done",        value: (statusCounts["Picked Up"] || 0) + (statusCounts["Completed"] || 0), color: "var(--text-muted)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-box">
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Queue list */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>All Orders</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{queue.length} order{queue.length !== 1 ? "s" : ""}</span>
        </div>

        {loading && (
          <div className="empty-state">
            <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div className="empty-state-title">Loading queue…</div>
          </div>
        )}

        {!loading && queue.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-title">Queue is empty</div>
            <div className="empty-state-desc">No active orders right now.</div>
          </div>
        )}

        {!loading && queue.length > 0 && (
          <div className="queue-list">
            {queue.map((o, idx) => {
              const meta = STATUS_META[o.status] || { badge: "badge-done", icon: "📄", label: o.status };
              return (
                <div key={o.id || idx} className="queue-item">
                  {/* Position badge */}
                  <div style={{ width: 36, height: 36, borderRadius: "var(--radius-full)", background: "var(--accent-light)", color: "var(--accent-text)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {idx + 1}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                        {meta.icon} Order #{o.id}
                      </span>
                      <span className={`badge ${meta.badge}`}>{meta.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                      {new Date(o.createdAt).toLocaleString()}
                    </div>
                    {o.serviceType && (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {o.serviceType}{o.vendorName ? ` · ${o.vendorName}` : ""}
                      </div>
                    )}
                  </div>

                  {/* Position label */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Position</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent)", lineHeight: 1.2 }}>#{idx + 1}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 16 }}>
        ↻ Auto-refreshes every 5 seconds
      </p>
    </div>
  );
}