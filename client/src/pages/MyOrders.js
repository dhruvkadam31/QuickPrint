// src/pages/MyOrders.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function MyOrders({ user }) {
  const [orders, setOrders]               = useState([]);
  const [tab, setTab]                     = useState("active");
  const [queueUpdates, setQueueUpdates]   = useState({});
  const [loading, setLoading]             = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice]     = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAllOrders();
  }, [user]);

  useEffect(() => {
    if (!user || tab !== "active") return;

    const updateQueuePositions = async () => {
      try {
        const activeOrders = orders.filter(o => o.status !== "Picked Up");
        const updatedOrders = await Promise.all(
          activeOrders.map(async (order) => {
            try {
              const response = await axios.get(`http://localhost:5000/queue-position/${order.orderId}`);
              if (response.data.success) {
                return {
                  ...order,
                  queuePosition:     response.data.position,
                  totalInQueue:      response.data.totalInQueue,
                  estimatedWaitTime: response.data.estimatedWaitTime,
                  vendorName:        response.data.vendorName,
                };
              }
            } catch (e) {
              console.error(`Queue update failed for ${order.orderId}:`, e);
            }
            return order;
          })
        );
        setOrders(prev =>
          prev.map(p => updatedOrders.find(u => u.orderId === p.orderId) || p)
        );
        setQueueUpdates({ last: `Last updated: ${new Date().toLocaleTimeString()}` });
      } catch (e) {
        console.error("Queue update error:", e);
      }
    };

    updateQueuePositions();
    const interval = setInterval(updateQueuePositions, 15000);
    return () => clearInterval(interval);
  }, [user, orders, tab]);

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/orders/${user.uid}`);
      setOrders(res.data);
    } catch (err) {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const refreshOrders = async () => {
    await fetchAllOrders();
    toast.info("Orders refreshed!");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Queued":      return <span className="badge badge-queued">⏳ Queued</span>;
      case "In Progress": return <span className="badge badge-progress">🔄 In Progress</span>;
      case "Ready":       return <span className="badge badge-ready">✅ Ready</span>;
      case "Picked Up":   return <span className="badge badge-done">📦 Picked Up</span>;
      default:            return <span className="badge badge-done">{status}</span>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Queued":      return { bg: "#eff6ff", color: "#1d4ed8" };
      case "In Progress": return { bg: "#fefce8", color: "#a16207" };
      case "Ready":       return { bg: "#f0fdf4", color: "#15803d" };
      case "Picked Up":   return { bg: "#f8fafc", color: "#475569" };
      default:            return { bg: "#f8fafc", color: "#475569" };
    }
  };

  const viewInvoice = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const downloadInvoice = () => {
    if (!selectedOrder) return;
    const blob = new Blob([generateInvoiceContent(selectedOrder)], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `invoice-${selectedOrder.orderId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded!");
  };

  const printInvoice = () => {
    if (!selectedOrder) return;
    const w = window.open("", "_blank");
    w.document.write(generateInvoiceContent(selectedOrder));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const generateInvoiceContent = (order) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice - ${order.orderId}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #fff; }
    .wrap { max-width: 720px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    .head { background: #0f172a; color: #fff; padding: 28px 32px; }
    .head h1 { margin: 0; font-size: 22px; letter-spacing: -0.5px; }
    .head p  { margin: 4px 0 0; font-size: 13px; opacity: 0.7; }
    .body { padding: 28px 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .section { background: #f8fafc; padding: 16px; border-radius: 8px; }
    .section h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    .section p  { margin: 5px 0; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead tr { background: #0f172a; color: #fff; }
    th, td { padding: 12px 14px; text-align: left; font-size: 14px; border-bottom: 1px solid #e2e8f0; }
    .total-row td { font-weight: 800; font-size: 15px; background: #f8fafc; }
    .footer { text-align: center; padding: 20px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1>⚡ QuickPrint</h1>
      <p>Invoice · Order #${order.orderId} · ${new Date(order.createdAt).toLocaleDateString()}</p>
    </div>
    <div class="body">
      <div class="grid">
        <div class="section">
          <h3>Customer</h3>
          <p><strong>ID:</strong> ${order.userId}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>
        <div class="section">
          <h3>Print Shop</h3>
          <p><strong>Name:</strong> ${order.vendorName || "QuickPrint Partner"}</p>
          <p><strong>ID:</strong> ${order.vendorId || "N/A"}</p>
        </div>
      </div>
      <div class="section" style="margin-bottom:24px">
        <h3>Print Configuration</h3>
        <p>
          <strong>Service:</strong> ${order.serviceType} &nbsp;·&nbsp;
          <strong>Color:</strong> ${order.color || "B&W"} &nbsp;·&nbsp;
          <strong>Sides:</strong> ${order.sides || "Single"} &nbsp;·&nbsp;
          <strong>Orientation:</strong> ${order.orientation || "Portrait"}
        </p>
        ${order.instructions ? `<p><strong>Instructions:</strong> ${order.instructions}</p>` : ""}
      </div>
      <table>
        <thead>
          <tr><th>Description</th><th>Pages</th><th>Rate</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Printing (${order.pageCount || order.totalPages} pages × ${order.quantity} copies)</td>
            <td>${order.totalPages || order.quantity * (order.pageCount || 1)}</td>
            <td>₹2.00 / page</td>
            <td>₹${order.estimatedPrice}</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" style="text-align:right">Total Amount Paid</td>
            <td>₹${order.estimatedPrice}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="footer">
      Thank you for choosing QuickPrint · support@quickprint.com · Generated ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;

  const filtered =
    tab === "active"    ? orders.filter(o => o.status !== "Picked Up") :
    tab === "completed" ? orders.filter(o => o.status === "Picked Up") :
    orders;

  const activeCount    = orders.filter(o => o.status !== "Picked Up").length;
  const readyCount     = orders.filter(o => o.status === "Ready").length;
  const completedCount = orders.filter(o => o.status === "Picked Up").length;

  return (
    <div className="page-wrapper">

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h2>My Orders</h2>
          <p>Track your print jobs in real-time</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {queueUpdates.last && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{queueUpdates.last}</span>
          )}
          <button
            onClick={refreshOrders}
            className="btn-secondary"
            disabled={loading}
            style={{ width: "auto" }}
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Stat row */}
      <div className="stat-row">
        <div className="stat-box">
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: "var(--status-ready-text)" }}>{readyCount}</div>
          <div className="stat-label">Ready</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: "var(--text-muted)" }}>{completedCount}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button onClick={() => setTab("active")}    className={tab === "active"    ? "active" : ""}>Active ({activeCount})</button>
        <button onClick={() => setTab("completed")} className={tab === "completed" ? "active" : ""}>Completed ({completedCount})</button>
        <button onClick={() => setTab("all")}       className={tab === "all"       ? "active" : ""}>All ({orders.length})</button>
      </div>

      {/* Orders */}
      <div className="orders-list">
        {filtered.length === 0 && !loading && (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">
              {tab === "active" ? "No active orders" : tab === "completed" ? "No completed orders" : "No orders yet"}
            </div>
            <div className="empty-state-desc">Orders you place will appear here.</div>
          </div>
        )}

        {filtered.map((o) => (
          <div key={o.orderId} className="order-item">
            <div className="order-item-header">

              {/* Left side */}
              <div className="order-item-left">
                <div className="order-title">
                  <span>{o.serviceType}</span>
                  <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 13 }}>
                    {o.quantity} {o.quantity === 1 ? "copy" : "copies"} · {o.totalPages || o.pageCount} pages
                  </span>
                </div>

                <div className="order-vendor">
                  🏪 {o.vendorName || "Print Shop"}
                </div>

                {/* Config chips */}
                <div className="order-config">
                  <span className="config-chip">{o.color || "B&W"}</span>
                  <span className="config-chip">{o.sides || "Single"} sided</span>
                  <span className="config-chip">{o.orientation || "Portrait"}</span>
                  {o.instructions && (
                    <span className="config-chip" title={o.instructions}>📝 Instructions</span>
                  )}
                </div>

                {/* Queue position bar */}
                {(o.status === "Queued" || o.status === "In Progress") && o.queuePosition && (
                  <div className="queue-card" style={{ marginTop: 10 }}>
                    <div className="queue-card-header">
                      <span className="queue-position-label">
                        Queue Position #{o.queuePosition}
                        {o.totalInQueue && (
                          <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>
                            of {o.totalInQueue}
                          </span>
                        )}
                      </span>
                      {o.estimatedWaitTime && (
                        <span className="queue-wait">⏱ ~{o.estimatedWaitTime} mins</span>
                      )}
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(100, ((o.queuePosition - 1) / (o.totalInQueue || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="progress-labels">
                      <span>Your turn: #{o.queuePosition}</span>
                      <span>Total: {o.totalInQueue || "—"}</span>
                    </div>
                  </div>
                )}

                {/* In Progress banner */}
                {o.status === "In Progress" && (
                  <div className="info-banner info-banner-yellow" style={{ marginTop: 10 }}>
                    <span>🔄</span>
                    <span>
                      <strong>Currently being printed</strong>
                      {o.printStartedAt && (
                        <span style={{ marginLeft: 8, fontWeight: 400 }}>
                          · Started {new Date(o.printStartedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Ready banner */}
                {o.status === "Ready" && (
                  <div className="info-banner info-banner-green" style={{ marginTop: 10 }}>
                    <span>🎉</span>
                    <span>
                      <strong>Your order is ready for pickup!</strong>
                      {o.readyAt && (
                        <span style={{ marginLeft: 8, fontWeight: 400 }}>
                          · Ready at {new Date(o.readyAt).toLocaleTimeString()}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                <div className="order-meta">
                  Order #{o.orderId} · {new Date(o.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Right side */}
              <div className="order-item-right">
                <div className="order-price">₹{o.estimatedPrice}</div>
                {getStatusBadge(o.status)}
                <button
                  onClick={() => viewInvoice(o)}
                  className="btn-ghost"
                  style={{ fontSize: 13, padding: "7px 14px", width: "auto", marginTop: 4 }}
                >
                  📄 Invoice
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

      {tab === "active" && orders.length > 0 && (
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 16 }}>
          ↻ Queue positions update every 15 seconds
        </p>
      )}

      {/* Invoice Modal */}
      {showInvoice && selectedOrder && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowInvoice(false)}
        >
          <div className="modal-box" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3>📄 Invoice · #{selectedOrder.orderId}</h3>
              <button className="modal-close" onClick={() => setShowInvoice(false)}>✕</button>
            </div>

            <div dangerouslySetInnerHTML={{ __html: generateInvoiceContent(selectedOrder) }} />

            <div className="modal-actions">
              <button onClick={printInvoice}            className="btn-primary"   style={{ width: "auto", flex: 1 }}>🖨️ Print</button>
              <button onClick={downloadInvoice}         className="btn-secondary" style={{ width: "auto", flex: 1 }}>📥 Download</button>
              <button onClick={() => setShowInvoice(false)} className="btn-ghost" style={{ width: "auto", flex: 1 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}