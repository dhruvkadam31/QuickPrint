// src/pages/VendorDashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function VendorDashboard() {
  const [orders, setOrders]                     = useState([]);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [vendor, setVendor]                     = useState(null);
  const [shopOpen, setShopOpen]                 = useState(true);
  const [showPrintModal, setShowPrintModal]     = useState(false);
  const [selectedOrder, setSelectedOrder]       = useState(null);
  const [selectedPrinter, setSelectedPrinter]   = useState("");
  const [loading, setLoading]                   = useState(false);
  const [revenueData, setRevenueData]           = useState({
    today: { total: 0, commission: 0, net: 0, ordersCount: 0 },
    weekly: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    const vendorData = localStorage.getItem("vendorData");
    const isVendor   = localStorage.getItem("isVendor") === "true";
    if (!isVendor || !vendorData) { navigate("/vendor_login"); return; }
    setVendor(JSON.parse(vendorData));
    setShopOpen(JSON.parse(vendorData).shopOpen || true);
    fetchVendorOrders();
    fetchRevenueData();
  }, [navigate]);

  const fetchVendorOrders = async () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem("vendorData"));
      const res = await axios.get(`http://localhost:5000/vendors/${vendorData.vendorId}/orders`);
      setOrders(res.data);
    } catch (err) {
      console.error("Fetch orders error:", err);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem("vendorData"));
      const res = await axios.get(`http://localhost:5000/vendors/${vendorData.vendorId}/revenue`);
      setRevenueData(res.data);
    } catch (err) {
      console.error("Fetch revenue error:", err);
      generateMockRevenueData();
    }
  };

  const generateMockRevenueData = () => {
    const today    = new Date();
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date       = new Date();
      date.setDate(today.getDate() - i);
      const dayRevenue = Math.floor(Math.random() * 500) + 100;
      const commission = dayRevenue * 0.10;
      weeklyData.push({
        date:        date.toISOString().split("T")[0],
        total:       dayRevenue,
        commission,
        net:         dayRevenue - commission,
        ordersCount: Math.floor(Math.random() * 5) + 1,
      });
    }
    setRevenueData({ today: weeklyData[weeklyData.length - 1], weekly: weeklyData });
  };

  useEffect(() => {
    setAvailablePrinters([
      { id: "printer1", name: "HP LaserJet Pro M404dn",        location: "Counter 1",    supportsColor: false, supportsDuplex: true },
      { id: "printer2", name: "Canon imageCLASS LBP623Cdw",    location: "Counter 2",    supportsColor: true,  supportsDuplex: true },
      { id: "printer3", name: "Epson WorkForce WF-2860",        location: "Back Office",  supportsColor: true,  supportsDuplex: true },
      { id: "printer4", name: "Brother HL-L8360CDW",            location: "Color Station",supportsColor: true,  supportsDuplex: true },
    ]);
  }, []);

  useEffect(() => {
    const iv = setInterval(fetchVendorOrders, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(fetchRevenueData, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (vendor) debugOrders();
  }, [vendor]);

  // Inject hover CSS once — replaces the broken <style jsx> blocks
  useEffect(() => {
    const style = document.createElement("style");
    style.id    = "vendor-dashboard-styles";
    style.textContent = `
      .revenue-card:hover .revenue-tooltip { opacity: 1 !important; }
      .chart-bar:hover .bar-tooltip        { opacity: 1 !important; }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById("vendor-dashboard-styles");
      if (el) document.head.removeChild(el);
    };
  }, []);

  const debugOrders = async () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem("vendorData"));
      const response   = await axios.get(`http://localhost:5000/debug/orders-by-vendor/${vendorData.vendorId}`);
      console.log("🔍 Debug - Vendor orders:", response.data);
    } catch (err) {
      console.error("Debug error:", err);
    }
  };

  const handlePrintClick = (order) => {
    setSelectedOrder(order);
    setSelectedPrinter("");
    setShowPrintModal(true);
  };

  const handlePrint = async () => {
    if (!selectedPrinter) { alert("Please select a printer"); return; }
    if (!selectedOrder) return;
    setLoading(true);
    const printer = availablePrinters.find(p => p.id === selectedPrinter);
    if (selectedOrder.color === "Color" && !printer.supportsColor) {
      alert(`❌ ${printer.name} does not support color printing.`);
      setLoading(false); return;
    }
    if (selectedOrder.sides === "Double" && !printer.supportsDuplex) {
      alert(`❌ ${printer.name} does not support double-sided printing.`);
      setLoading(false); return;
    }
    try {
      const response = await axios.post("http://localhost:5000/print", {
        orderId:     selectedOrder.orderId,
        printerId:   selectedPrinter,
        fileUrl:     selectedOrder.fileUrl,
        printConfig: {
          copies:      selectedOrder.quantity || 1,
          color:       selectedOrder.color || "B&W",
          sides:       selectedOrder.sides || "Single",
          orientation: selectedOrder.orientation || "Portrait",
          pageRange:   "all",
        },
      });
      if (response.data.success) {
        toast.success(`✅ Print job sent to ${printer.name}!`);
        await updateOrderStatus(selectedOrder.orderId, "In Progress");
        setShowPrintModal(false);
        setSelectedOrder(null);
        setSelectedPrinter("");
      } else {
        toast.error("❌ Print failed: " + response.data.error);
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("❌ Print failed: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      let response;
      try {
        response = await axios.patch(`http://localhost:5000/orders/${orderId}`, { status });
      } catch {
        response = await axios.patch(`http://localhost:5000/orders/update-status`, { orderId, status });
      }
      if (response.data.success) { fetchVendorOrders(); return true; }
      throw new Error("Invalid response");
    } catch (err) {
      console.error("❌ Update failed:", err);
      if (err.response?.status === 404) {
        toast.error("Order not found.");
      } else {
        toast.error("Failed to update: " + (err.response?.data?.error || err.message));
      }
      return false;
    }
  };

  const toggleShopStatus = async () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem("vendorData"));
      const newStatus  = !shopOpen;
      const response   = await axios.patch(`http://localhost:5000/vendors/${vendorData.vendorId}/shop-status`, { shopOpen: newStatus });
      if (response.data.success) {
        setShopOpen(newStatus);
        const updated = { ...vendorData, shopOpen: newStatus };
        localStorage.setItem("vendorData", JSON.stringify(updated));
        setVendor(updated);
        toast.success(`Shop is now ${newStatus ? "OPEN 🟢" : "CLOSED 🔴"}`);
      }
    } catch (err) {
      console.error("Toggle shop error:", err);
      toast.error("Failed to update shop status");
    }
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

  const getCompatiblePrinters = (order) => {
    if (!order) return availablePrinters;
    return availablePrinters.filter(p =>
      (order.color !== "Color" || p.supportsColor) &&
      (order.sides !== "Double" || p.supportsDuplex)
    );
  };

  // ── Sub-components (no style jsx) ─────────────────────────────────────────
  const RevenueCard = () => (
    <div
      className="revenue-card card"
      style={{ marginBottom: 0, position: "relative", cursor: "default" }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>💰 Today's Revenue</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--status-ready-text)", letterSpacing: -1 }}>
            ₹{revenueData.today.net}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Net Earnings</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total: ₹{revenueData.today.total}</div>
          <div style={{ fontSize: 12, color: "#ef4444", marginTop: 2 }}>Commission: ₹{revenueData.today.commission}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{revenueData.today.ordersCount} orders</div>
        </div>
      </div>

      {/* Hover tooltip — controlled by CSS injected in useEffect */}
      <div
        className="revenue-tooltip"
        style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "var(--text-primary)", color: "#fff",
          padding: 12, borderRadius: "var(--radius-md)", marginTop: 8,
          fontSize: 13, opacity: 0, transition: "opacity 0.2s",
          pointerEvents: "none", zIndex: 100,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Revenue Breakdown</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span>Total:</span><span>₹{revenueData.today.total}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#fca5a5" }}>
          <span>Commission (10%):</span><span>₹{revenueData.today.commission}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#6ee7b7" }}>
          <span>Your Earnings:</span><span>₹{revenueData.today.net}</span>
        </div>
      </div>
    </div>
  );

  const WeeklyRevenueChart = () => {
    const maxRevenue = Math.max(...revenueData.weekly.map(d => d.total), 100);
    return (
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>📈 Weekly Revenue</div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 120, gap: 8 }}>
          {revenueData.weekly.map((day, i) => {
            const height  = Math.max((day.total / maxRevenue) * 90, 4);
            const isToday = i === revenueData.weekly.length - 1;
            return (
              <div key={day.date} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div
                  className="chart-bar"
                  style={{
                    width: "100%", height: `${height}px`, position: "relative",
                    background: isToday ? "var(--status-ready-text)" : "var(--accent)",
                    borderRadius: "4px 4px 0 0", transition: "all 0.3s ease",
                  }}
                >
                  {/* Bar tooltip */}
                  <div
                    className="bar-tooltip"
                    style={{
                      position: "absolute", bottom: "100%", left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--text-primary)", color: "#fff",
                      padding: "6px 8px", borderRadius: "var(--radius-sm)",
                      fontSize: 12, whiteSpace: "nowrap", marginBottom: 4,
                      opacity: 0, transition: "opacity 0.2s", pointerEvents: "none",
                    }}
                  >
                    <div>{new Date(day.date).toLocaleDateString()}</div>
                    <div>Total: ₹{day.total}</div>
                    <div>Net: ₹{day.net}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, textAlign: "center", fontWeight: isToday ? 700 : 400 }}>
                  {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div style={{ fontSize: 11, color: "var(--status-ready-text)", fontWeight: 700 }}>
                  ₹{day.net}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!vendor) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", flexDirection: "column", gap: 16, color: "var(--text-muted)" }}>
        <div style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontWeight: 600 }}>Loading dashboard…</span>
      </div>
    );
  }

  const queuedOrders    = orders.filter(o => o.status === "Queued");
  const inProgressOrders = orders.filter(o => o.status === "In Progress");
  const readyOrders     = orders.filter(o => o.status === "Ready");
  const completedOrders = orders.filter(o => o.status === "Picked Up");
  const compatiblePrinters = getCompatiblePrinters(selectedOrder);

  return (
    <div>
      <NavBar user={vendor} />

      <div className="page-wrapper" style={{ maxWidth: 1000 }}>

        {/* Page header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h2>Vendor Dashboard</h2>
            <p>{vendor.name}</p>
          </div>
          <button
            onClick={toggleShopStatus}
            className={shopOpen ? "btn-primary" : "btn-danger"}
            style={{ width: "auto" }}
          >
            {shopOpen ? "🟢 Shop Open — Click to Close" : "🔴 Shop Closed — Click to Open"}
          </button>
        </div>

        {/* Revenue row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 24 }}>
          <RevenueCard />
          <WeeklyRevenueChart />
        </div>

        {/* Stats */}
        <div className="stat-row" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
          {[
            { label: "Queued",      value: queuedOrders.length,     color: "var(--status-queued-text)" },
            { label: "In Progress", value: inProgressOrders.length, color: "var(--status-progress-text)" },
            { label: "Ready",       value: readyOrders.length,      color: "var(--status-ready-text)" },
            { label: "Completed",   value: completedOrders.length,  color: "var(--text-muted)" },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-box">
              <div className="stat-value" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Queued Orders ── */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>⏳ Queued Orders ({queuedOrders.length})</div>
          {queuedOrders.length === 0
            ? <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-state-title">No queued orders</div></div>
            : <div className="orders-list">
                {queuedOrders.map(order => (
                  <div key={order.orderId} className="order-item">
                    <div className="order-item-header">
                      <div className="order-item-left">
                        <div className="order-title">#{order.orderId} — {order.serviceType}</div>
                        <div style={{ marginTop: 10, padding: 12, background: "var(--accent-light)", borderRadius: "var(--radius-md)", border: "1px solid rgba(29,78,216,0.15)" }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: "var(--accent-text)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                            📋 Client Configuration
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 13 }}>
                            {[
                              ["Copies", order.quantity],
                              ["Pages / copy", order.pageCount || order.totalPages],
                              ["Color", order.color || "B&W"],
                              ["Sides", order.sides || "Single"],
                              ["Orientation", order.orientation || "Portrait"],
                              ["Total pages", order.totalPages || (order.quantity * (order.pageCount || 1))],
                            ].map(([l, v]) => (
                              <div key={l}><span style={{ color: "var(--text-muted)" }}>{l}:</span> <strong>{v}</strong></div>
                            ))}
                          </div>
                          {order.instructions && (
                            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                              <strong>Instructions:</strong> {order.instructions}
                            </div>
                          )}
                        </div>
                        <div className="order-meta" style={{ marginTop: 8 }}>
                          Client: {order.userId} · {new Date(order.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="order-item-right">
                        <button onClick={() => handlePrintClick(order)} className="btn-primary" style={{ width: "auto" }}>🖨️ Print</button>
                        <button onClick={() => updateOrderStatus(order.orderId, "In Progress")} className="btn-ghost" style={{ width: "auto", fontSize: 13 }}>Start Processing</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>

        {/* ── In Progress ── */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>🔄 In Progress ({inProgressOrders.length})</div>
          {inProgressOrders.length === 0
            ? <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-state-title">Nothing printing right now</div></div>
            : <div className="orders-list">
                {inProgressOrders.map(order => (
                  <div key={order.orderId} className="order-item">
                    <div className="order-item-header">
                      <div className="order-item-left">
                        <div className="order-title">#{order.orderId} — {order.serviceType}</div>
                        <div className="order-config" style={{ marginTop: 8 }}>
                          <span className="config-chip">{order.quantity} copies</span>
                          <span className="config-chip">{order.totalPages || order.pageCount} pages</span>
                          <span className="config-chip">{order.color || "B&W"}</span>
                          <span className="config-chip">{order.sides || "Single"}</span>
                        </div>
                        <div className="order-meta">
                          Started: {order.printStartedAt ? new Date(order.printStartedAt).toLocaleString() : "Recently"}
                        </div>
                      </div>
                      <div className="order-item-right">
                        <button onClick={() => updateOrderStatus(order.orderId, "Ready")} className="btn-primary" style={{ width: "auto" }}>
                          Mark as Ready ✅
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>

        {/* ── Ready for Pickup ── */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>✅ Ready for Pickup ({readyOrders.length})</div>
          {readyOrders.length === 0
            ? <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-state-title">No orders awaiting pickup</div></div>
            : <div className="orders-list">
                {readyOrders.map(order => (
                  <div key={order.orderId} className="order-item">
                    <div className="order-item-header">
                      <div className="order-item-left">
                        <div className="order-title">#{order.orderId} — {order.serviceType}</div>
                        <div className="order-meta">
                          Ready since: {order.readyAt ? new Date(order.readyAt).toLocaleString() : "Recently"}
                        </div>
                      </div>
                      <div className="order-item-right">
                        <button onClick={() => updateOrderStatus(order.orderId, "Picked Up")} className="btn-ghost" style={{ width: "auto" }}>
                          Mark as Picked Up 📦
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>

        {/* ── Completed ── */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📦 Completed ({completedOrders.length})</div>
          {completedOrders.length === 0
            ? <div className="empty-state" style={{ padding: "24px 0" }}><div className="empty-state-title">No completed orders yet</div></div>
            : <div className="orders-list">
                {completedOrders.map(order => (
                  <div key={order.orderId} className="order-item">
                    <div className="order-item-header">
                      <div className="order-item-left">
                        <div className="order-title">#{order.orderId} — {order.serviceType}</div>
                        <div className="order-meta">
                          Completed: {order.pickedUpAt ? new Date(order.pickedUpAt).toLocaleString() : "Recently"}
                        </div>
                      </div>
                      <div className="order-item-right">
                        <span className="badge badge-done">✅ Completed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
        </div>

      </div>

      {/* ── Print Modal ── */}
      {showPrintModal && selectedOrder && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPrintModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>🖨️ Print Order #{selectedOrder.orderId}</h3>
              <button className="modal-close" onClick={() => { setShowPrintModal(false); setSelectedOrder(null); setSelectedPrinter(""); }}>✕</button>
            </div>

            {/* Order summary */}
            <div className="pricing-box" style={{ marginBottom: 20 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Order Details</div>
              {[
                ["Service",      selectedOrder.serviceType],
                ["Copies",       selectedOrder.quantity],
                ["Total Pages",  selectedOrder.totalPages || (selectedOrder.quantity * (selectedOrder.pageCount || 1))],
                ["Color",        selectedOrder.color || "B&W"],
                ["Sides",        selectedOrder.sides || "Single"],
                ["Orientation",  selectedOrder.orientation || "Portrait"],
                ...(selectedOrder.instructions ? [["Instructions", selectedOrder.instructions]] : []),
              ].map(([l, v]) => (
                <div key={l} className="pricing-row" style={{ fontSize: 13 }}>
                  <span>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Printer select */}
            <div className="form-row">
              <label className="input-label">Select Printer</label>
              <select className="input" value={selectedPrinter} onChange={e => setSelectedPrinter(e.target.value)}>
                <option value="">Choose a printer…</option>
                {compatiblePrinters.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.location}) · {p.supportsColor ? "Color" : "B&W"} · {p.supportsDuplex ? "Duplex" : "Single-side"}
                  </option>
                ))}
              </select>
              {compatiblePrinters.length === 0 && (
                <div className="info-banner info-banner-red" style={{ marginTop: 8 }}>
                  ⚠️ No compatible printers for this order's requirements.
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button onClick={() => { setShowPrintModal(false); setSelectedOrder(null); setSelectedPrinter(""); }} className="btn-ghost" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handlePrint} disabled={!selectedPrinter || loading} className="btn-primary" style={{ flex: 1 }}>
                {loading ? "🔄 Printing…" : "🖨️ Send to Printer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}