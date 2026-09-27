import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminAnalyticsSummary, getAllOrdersAdmin } from "../../services/api";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = async () => {
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        getAdminAnalyticsSummary().catch(() => ({ data: { success: false } })),
        getAllOrdersAdmin().catch(() => ({ data: [] })),
      ]);

      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data);
      }
      if (Array.isArray(ordersRes.data)) {
        setOrders(ordersRes.data);
      }
    } catch (err) {
      toast.error("Failed to load admin analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("isAdmin");
    toast.success("Admin session terminated");
    navigate("/admin/login");
  };

  const revenue = analytics?.revenueStats || {
    totalRevenue: 0,
    netRevenue: 0,
    refundedAmount: 0,
    platformCommission: 0,
    vendorPayouts: 0,
  };

  const orderStats = analytics?.orderStats || {
    total: orders.length,
    today: 0,
    queued: orders.filter((o) => o.status === "Queued").length,
    inProgress: orders.filter((o) => o.status === "Printing").length,
    ready: orders.filter((o) => o.status === "Ready").length,
    completed: orders.filter((o) => o.status === "Picked Up").length,
    cancelled: orders.filter((o) => o.status === "Cancelled").length,
  };

  const vendors = analytics?.vendorStats?.vendors || [];
  const trends = analytics?.dailyTrends || [];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Admin Navbar */}
      <nav
        style={{
          background: "#0f172a",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.4rem" }}>🛡️</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>QuickPrint</span>
            <span
              style={{
                marginLeft: 8,
                background: "#dc2626",
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Admin Suite
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => navigate("/upload")}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            User App ↗
          </button>
          <button
            onClick={() => navigate("/vendor/dashboard")}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "white",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Vendor Portal ↗
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              border: "none",
              color: "white",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "24px auto", padding: "0 16px" }}>
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            📊 Analytics Overview
          </button>
          <button
            className={`tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            📦 All Orders ({orders.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "vendors" ? "active" : ""}`}
            onClick={() => setActiveTab("vendors")}
          >
            🏪 Partner Vendors ({vendors.length})
          </button>
        </div>

        {loading ? (
          <p className="text-muted text-center" style={{ padding: 40 }}>
            Loading platform intelligence...
          </p>
        ) : (
          <>
            {activeTab === "overview" && (
              <>
                {/* Revenue Metrics Grid */}
                <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: "#0284c7" }}>
                      ₹{revenue.totalRevenue}
                    </div>
                    <div className="stat-label">Gross Platform Revenue</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: "#16a34a" }}>
                      ₹{revenue.netRevenue}
                    </div>
                    <div className="stat-label">Net Settled Revenue</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: "#8b5cf6" }}>
                      ₹{revenue.platformCommission}
                    </div>
                    <div className="stat-label">Platform Margin (10%)</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: "#f59e0b" }}>
                      ₹{revenue.vendorPayouts}
                    </div>
                    <div className="stat-label">Vendor Payouts (90%)</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: "#ef4444" }}>
                      ₹{revenue.refundedAmount}
                    </div>
                    <div className="stat-label">Refunded Amount</div>
                  </div>
                </div>

                {/* Order Status Distribution */}
                <div className="stats-grid" style={{ marginTop: 16 }}>
                  <div className="stat-card">
                    <div className="stat-value">{orderStats.total}</div>
                    <div className="stat-label">Total Volume</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: "#f59e0b" }}>
                      {orderStats.queued + orderStats.inProgress}
                    </div>
                    <div className="stat-label">In Print Pipeline</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: "#16a34a" }}>
                      {orderStats.completed}
                    </div>
                    <div className="stat-label">Fulfilled Pickups</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: "#ef4444" }}>
                      {orderStats.cancelled}
                    </div>
                    <div className="stat-label">Cancelled / Refunded</div>
                  </div>
                </div>

                {/* 7-Day Revenue Trend Chart */}
                <div className="card" style={{ marginTop: 24 }}>
                  <h3 style={{ marginBottom: 16 }}>📈 7-Day Revenue Trend</h3>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 16,
                      height: 180,
                      padding: "20px 10px 0 10px",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {trends.map((t, idx) => {
                      const maxRev = Math.max(...trends.map((x) => x.revenue), 100);
                      const heightPercent = Math.max(12, Math.round((t.revenue / maxRev) * 100));

                      return (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            height: "100%",
                            justifyContent: "flex-end",
                          }}
                        >
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                            ₹{t.revenue}
                          </span>
                          <div
                            style={{
                              width: "70%",
                              height: `${heightPercent}%`,
                              background: "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
                              borderRadius: "4px 4px 0 0",
                              transition: "height 0.3s ease",
                            }}
                          ></div>
                          <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 8 }}>
                            {t.date}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === "orders" && (
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Live System Orders</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px" }}>Order Code</th>
                        <th style={{ padding: "10px 12px" }}>User</th>
                        <th style={{ padding: "10px 12px" }}>Vendor</th>
                        <th style={{ padding: "10px 12px" }}>Service</th>
                        <th style={{ padding: "10px 12px" }}>Pages / Copies</th>
                        <th style={{ padding: "10px 12px" }}>Amount</th>
                        <th style={{ padding: "10px 12px" }}>Status</th>
                        <th style={{ padding: "10px 12px" }}>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.orderId} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                            #{o.orderCode || o.orderId.slice(-4)}
                          </td>
                          <td style={{ padding: "10px 12px" }}>{o.userName || o.userEmail || o.userId}</td>
                          <td style={{ padding: "10px 12px" }}>{o.vendorName || "Hub"}</td>
                          <td style={{ padding: "10px 12px" }}>{o.serviceType}</td>
                          <td style={{ padding: "10px 12px" }}>
                            {o.pageCount} pgs × {o.quantity} cpy
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700 }}>₹{o.estimatedPrice}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                background:
                                  o.status === "Ready"
                                    ? "#dcfce7"
                                    : o.status === "Cancelled"
                                    ? "#fee2e2"
                                    : o.status === "Picked Up"
                                    ? "#e2e8f0"
                                    : "#fef3c7",
                                color:
                                  o.status === "Ready"
                                    ? "#15803d"
                                    : o.status === "Cancelled"
                                    ? "#b91c1c"
                                    : o.status === "Picked Up"
                                    ? "#475569"
                                    : "#b45309",
                              }}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ textTransform: "capitalize", fontWeight: 500 }}>
                              {o.paymentStatus || "paid"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "vendors" && (
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Registered Vendor Shops</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px" }}>Shop Name</th>
                        <th style={{ padding: "10px 12px" }}>Availability</th>
                        <th style={{ padding: "10px 12px" }}>B&W Price</th>
                        <th style={{ padding: "10px 12px" }}>Color Price</th>
                        <th style={{ padding: "10px 12px" }}>Orders Handled</th>
                        <th style={{ padding: "10px 12px" }}>Gross Revenue</th>
                        <th style={{ padding: "10px 12px" }}>Vendor Net Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((v, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{v.name}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                color: v.shopOpen ? "#16a34a" : "#dc2626",
                                fontWeight: 600,
                              }}
                            >
                              {v.shopOpen ? "● Open" : "○ Closed"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>₹{v.bwPrice || 1.5}/pg</td>
                          <td style={{ padding: "10px 12px" }}>₹{v.colorPrice || 5.0}/pg</td>
                          <td style={{ padding: "10px 12px" }}>{v.totalOrders} orders</td>
                          <td style={{ padding: "10px 12px", fontWeight: 700 }}>₹{v.totalRevenue}</td>
                          <td style={{ padding: "10px 12px", color: "#16a34a", fontWeight: 700 }}>
                            ₹{v.vendorEarnings}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Create Vendor Form */}
                <div style={{ marginTop: 32, padding: 24, background: "white", borderRadius: 12, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}>
                  <h3 style={{ marginBottom: 20 }}>➕ Register New Vendor</h3>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target;
                      const data = {
                        name: form.name.value,
                        email: form.email.value,
                        password: form.password.value,
                        shopName: form.shopName.value,
                        phone: form.phone.value,
                      };
                      try {
                        const { vendorRegister } = await import("../../services/api");
                        await vendorRegister(data);
                        toast.success("Vendor created successfully!");
                        form.reset();
                      } catch (err) {
                        toast.error(err.response?.data?.error || "Failed to create vendor");
                      }
                    }}
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}
                  >
                    <div>
                      <label className="input-label">Owner Name</label>
                      <input name="name" className="input" type="text" required placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="input-label">Shop Name</label>
                      <input name="shopName" className="input" type="text" required placeholder="QuickPrint Campus" />
                    </div>
                    <div>
                      <label className="input-label">Login Email</label>
                      <input name="email" className="input" type="email" required placeholder="vendor@example.com" />
                    </div>
                    <div>
                      <label className="input-label">Login Password</label>
                      <input name="password" className="input" type="password" required placeholder="••••••••" minLength={6} />
                    </div>
                    <div>
                      <label className="input-label">Phone Number</label>
                      <input name="phone" className="input" type="text" placeholder="9876543210" />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <button className="btn btn-primary btn-full" type="submit" style={{ height: "42px" }}>
                        Create Vendor
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
