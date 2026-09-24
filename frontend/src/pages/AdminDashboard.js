// src/pages/AdminDashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import NavBar from "../components/NavBar";

export default function AdminDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [shopOpen, setShopOpen] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch real analytics and order queue
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [queueRes, analyticsRes, shopRes] = await Promise.all([
        axios.get("http://localhost:5000/api/orders"),
        axios.get("http://localhost:5000/api/analytics/summary"),
        axios.get("http://localhost:5000/api/shop-status"),
      ]);

      if (Array.isArray(queueRes.data)) {
        setOrders(queueRes.data);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
      if (typeof shopRes.data.open === 'boolean') {
        setShopOpen(shopRes.data.open);
      }
    } catch (err) {
      console.error("Dashboard data fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const printers = [
      { id: "printer1", name: "HP LaserJet Pro M404dn", location: "Counter 1" },
      { id: "printer2", name: "Canon imageCLASS LBP623Cdw", location: "Counter 2" },
      { id: "printer3", name: "Epson WorkForce WF-2860", location: "Back Office" },
      { id: "printer4", name: "Brother HL-L8360CDW", location: "Color Station" }
    ];
    setAvailablePrinters(printers);
    setSelectedPrinter(printers[0]?.id || "");
  }, []);

  const toggleShop = async () => {
    try {
      const newStatus = !shopOpen;
      setShopOpen(newStatus);
      await axios.post("http://localhost:5000/api/shop-status", { open: newStatus });
    } catch (err) {
      console.error("Toggle shop error:", err.message);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      const res = await axios.patch(`http://localhost:5000/api/orders/${orderId}`, { status });
      if (res.data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.orderId === orderId ? { ...o, status: res.data.status } : o))
        );
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Update failed:", err.message);
    }
  };

  const handlePrintClick = (order) => {
    setSelectedOrder(order);
    setShowPrintDialog(true);
  };

  const handlePrintExecute = async () => {
    if (!selectedOrder || !selectedPrinter) {
      alert("Please select a printer");
      return;
    }

    try {
      const printData = {
        orderId: selectedOrder.orderId,
        printerId: selectedPrinter,
        fileUrl: selectedOrder.fileUrl,
        printConfig: {
          copies: selectedOrder.quantity || 1,
          color: selectedOrder.color || "B&W",
          sides: selectedOrder.sides || "Single",
          orientation: selectedOrder.orientation || "Portrait",
        }
      };

      const response = await axios.post("http://localhost:5000/print", printData);
      
      if (response.data.success) {
        alert(`Print job sent to printer successfully!`);
        await updateStatus(selectedOrder.orderId, "In Progress");
        setShowPrintDialog(false);
        setSelectedOrder(null);
      } else {
        alert("Print failed: " + response.data.error);
      }
    } catch (error) {
      alert("Print failed: " + (error.response?.data?.error || error.message));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Queued": return { bg: "#e0f2fe", color: "#0369a1" };
      case "In Progress": return { bg: "#fef3c7", color: "#92400e" };
      case "Ready": return { bg: "#d1fae5", color: "#065f46" };
      case "Picked Up": return { bg: "#f3f4f6", color: "#374151" };
      case "Cancelled": return { bg: "#fee2e2", color: "#991b1b" };
      default: return { bg: "#f3f4f6", color: "#374151" };
    }
  };

  const orderStats = analytics?.orderStats || { total: orders.length, today: 0, queued: 0, inProgress: 0, ready: 0, completed: 0, cancelled: 0 };
  const revStats = analytics?.revenueStats || { totalRevenue: 0, todayRevenue: 0, netRevenue: 0, refundedAmount: 0, platformCommission: 0 };
  const dailyTrends = analytics?.dailyTrends || [];
  const vendorStats = analytics?.vendorStats || { totalVendors: 0, activeVendors: 0, vendors: [] };
  const cancelStats = analytics?.cancellationStats || { totalCancelled: 0, cancellationRate: "0%" };

  // Max revenue calculation for bar chart scale
  const maxRevenue = Math.max(100, ...dailyTrends.map(d => d.revenue || 0));

  return (
    <div>
      {user && <NavBar user={user} />}

      <div className="page-wrapper" style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, color: '#0F172A' }}>📊 Admin Real-Time Analytics Dashboard</h2>
              <p className="small-muted" style={{ margin: '4px 0 0 0', textAlign: 'left' }}>
                Live platform performance metrics computed from actual MongoDB order data.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                onClick={toggleShop}
                style={{
                  background: shopOpen ? "#10b981" : "#ef4444",
                  color: "#fff",
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                {shopOpen ? "🟢 Platform Shops OPEN" : "🔴 Platform Shops CLOSED"}
              </button>
              
              <button 
                onClick={fetchDashboardData} 
                className="btn-secondary" 
                style={{ padding: '9px 14px', borderRadius: 10 }}
              >
                {loading ? '🔄 Updating...' : '🔄 Refresh Stats'}
              </button>
            </div>
          </div>

          {/* Metric Summary Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            <div style={{ backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 600 }}>Total Orders</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e40af', marginTop: 4 }}>{orderStats.total}</div>
              <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: 4 }}>Today: {orderStats.today}</div>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: 16, borderRadius: 12, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 600 }}>Gross Revenue</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#166534', marginTop: 4 }}>₹{revStats.totalRevenue}</div>
              <div style={{ fontSize: '12px', color: '#22c55e', marginTop: 4 }}>Today: ₹{revStats.todayRevenue}</div>
            </div>

            <div style={{ backgroundColor: '#fefce8', padding: 16, borderRadius: 12, border: '1px solid #fef08a' }}>
              <div style={{ fontSize: '13px', color: '#a16207', fontWeight: 600 }}>Platform Commission (10%)</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#854d0e', marginTop: 4 }}>₹{revStats.platformCommission}</div>
              <div style={{ fontSize: '12px', color: '#ca8a04', marginTop: 4 }}>Net Rev: ₹{revStats.netRevenue}</div>
            </div>

            <div style={{ backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, border: '1px solid #fca5a5' }}>
              <div style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>Refunded Amount</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#991b1b', marginTop: 4 }}>₹{revStats.refundedAmount}</div>
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: 4 }}>Cancelled: {orderStats.cancelled} ({cancelStats.cancellationRate})</div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>Active Print Shops</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{vendorStats.activeVendors} / {vendorStats.totalVendors}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: 4 }}>Active Queue: {orderStats.queued + orderStats.inProgress}</div>
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 24 }}>
            {/* Daily Revenue Bar Chart */}
            <div style={{ backgroundColor: '#ffffff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h4 style={{ margin: '0 0 14px 0', color: '#1e293b' }}>📈 7-Day Revenue & Order Volume</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 12, paddingTop: 10 }}>
                {dailyTrends.map((d, i) => {
                  const heightPercent = Math.max(8, Math.round((d.revenue / maxRevenue) * 100));
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', marginBottom: 4 }}>₹{d.revenue}</div>
                      <div 
                        style={{ 
                          width: '100%', 
                          height: `${heightPercent}%`, 
                          backgroundColor: '#22c55e', 
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.4s ease'
                        }} 
                        title={`Orders: ${d.orders}, Revenue: ₹${d.revenue}`}
                      />
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: 6, fontWeight: 500 }}>{d.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Status Distribution Progress Bars */}
            <div style={{ backgroundColor: '#ffffff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h4 style={{ margin: '0 0 14px 0', color: '#1e293b' }}>📊 Order Status Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Queued', count: orderStats.queued, color: '#0284c7', bg: '#e0f2fe' },
                  { label: 'In Progress', count: orderStats.inProgress, color: '#d97706', bg: '#fef3c7' },
                  { label: 'Ready for Pickup', count: orderStats.ready, color: '#16a34a', bg: '#dcfce7' },
                  { label: 'Completed (Picked Up)', count: orderStats.completed, color: '#475569', bg: '#f1f5f9' },
                  { label: 'Cancelled & Refunded', count: orderStats.cancelled, color: '#dc2626', bg: '#fee2e2' },
                ].map((item, idx) => {
                  const pct = orderStats.total > 0 ? Math.round((item.count / orderStats.total) * 100) : 0;
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{item.label} ({item.count})</span>
                        <span style={{ fontWeight: 700, color: item.color }}>{pct}%</span>
                      </div>
                      <div style={{ width: '100%', height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: item.color, borderRadius: 5 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Vendors Performance Overview */}
          {vendorStats.vendors && vendorStats.vendors.length > 0 && (
            <div style={{ marginBottom: 24, backgroundColor: '#ffffff', padding: 18, borderRadius: 12, border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>🏪 Vendor Print Shops Metrics</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: 10 }}>Vendor Name</th>
                    <th style={{ padding: 10 }}>Status</th>
                    <th style={{ padding: 10 }}>Total Orders</th>
                    <th style={{ padding: 10 }}>Gross Revenue</th>
                    <th style={{ padding: 10 }}>Vendor Net Payout (90%)</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorStats.vendors.map((v) => (
                    <tr key={v.vendorId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: 10, fontWeight: 600 }}>{v.name} ({v.vendorId})</td>
                      <td style={{ padding: 10 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '12px', fontWeight: 700, backgroundColor: v.shopOpen ? '#dcfce7' : '#fee2e2', color: v.shopOpen ? '#166534' : '#991b1b' }}>
                          {v.shopOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                      </td>
                      <td style={{ padding: 10 }}>{v.totalOrders}</td>
                      <td style={{ padding: 10, fontWeight: 700 }}>₹{v.totalRevenue}</td>
                      <td style={{ padding: 10, color: '#16a34a', fontWeight: 700 }}>₹{v.vendorEarnings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* All Live Orders List & Quick Operations */}
          <h4 style={{ marginTop: 24, marginBottom: 12, color: '#0F172A' }}>📋 Live Platform Orders & Dispatch</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.length === 0 ? (
              <div className="small-muted" style={{ textAlign: 'center', padding: 20 }}>No active orders found.</div>
            ) : (
              orders.map((o) => {
                const sStyle = getStatusColor(o.status);
                return (
                  <div key={o.orderId} style={{ padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>#{o.orderId}</span>
                        <span>• {o.serviceType} ({o.quantity} copies)</span>
                        <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: '11px', fontWeight: 700, backgroundColor: sStyle.bg, color: sStyle.color }}>
                          {o.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        User: {o.userId} • Vendor: {o.vendorName || o.vendorId || 'Print Shop'} • Date: {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>₹{o.estimatedPrice}</div>
                      {o.status === "Queued" && (
                        <button
                          onClick={() => handlePrintClick(o)}
                          style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                        >
                          🖨️ Dispatch Print
                        </button>
                      )}
                      {o.status === "In Progress" && (
                        <button
                          onClick={() => updateStatus(o.orderId, "Ready")}
                          style={{ background: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                        >
                          ✅ Mark Ready
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Print Dispatch Dialog */}
      {showPrintDialog && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, maxWidth: 450, width: '90%' }}>
            <h3>🖨️ Send Print Job</h3>
            <p>Order ID: {selectedOrder.orderId}</p>

            <div style={{ marginBottom: 16 }}>
              <label className="input-label">Select Available Printer</label>
              <select className="input" value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)}>
                {availablePrinters.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowPrintDialog(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handlePrintExecute} className="btn-primary" style={{ flex: 1 }}>Send to Printer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}