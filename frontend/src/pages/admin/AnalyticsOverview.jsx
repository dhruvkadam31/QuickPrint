import { RupeeIcon, TrendingUpIcon, PercentIcon, StoreIcon, UsersIcon, PackageIcon, PrinterIcon, CheckCircleIcon, AlertTriangleIcon, EyeIcon } from "./AdminIcons";
import RevenueTrendChart from "./RevenueTrendChart";

export default function AnalyticsOverview({
  analytics,
  orders = [],
  loading = false,
  onViewOrder,
  onViewAllOrders,
}) {
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
    weekly: 0,
    monthly: 0,
    queued: orders.filter((o) => o.status === "Queued").length,
    inProgress: orders.filter((o) => o.status === "Printing").length,
    ready: orders.filter((o) => o.status === "Ready").length,
    completed: orders.filter((o) => o.status === "Picked Up").length,
    cancelled: orders.filter((o) => o.status === "Cancelled").length,
    totalCustomers: 0,
  };

  const vendorStats = analytics?.vendorStats || {
    totalVendors: 0,
    activeVendors: 0,
    vendors: [],
  };

  const cancellation = analytics?.cancellationStats || {
    totalCancelled: orderStats.cancelled || 0,
    cancellationRate: "0%",
    reasons: {},
  };

  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return (
      <div>
        {/* Metric Skeletons */}
        <div className="admin-metrics-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="admin-metric-card">
              <div className="skeleton-box" style={{ height: 16, width: "60%", marginBottom: 12 }} />
              <div className="skeleton-box" style={{ height: 32, width: "80%", marginBottom: 8 }} />
              <div className="skeleton-box" style={{ height: 12, width: "40%" }} />
            </div>
          ))}
        </div>
        <div className="skeleton-box" style={{ height: 260, borderRadius: 12, marginBottom: 24 }} />
        <div className="skeleton-box" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  return (
    <div>
      {/* ── Operational Quick Stats Bar ── */}
      <div className="admin-quick-stats">
        <div className="admin-quick-stat-box">
          <div className="admin-quick-stat-icon" style={{ background: "#eff6ff", color: "var(--admin-brand-blue)" }}>
            <UsersIcon size={20} />
          </div>
          <div>
            <div className="admin-quick-stat-number">{orderStats.totalCustomers ?? 0}</div>
            <div className="admin-quick-stat-name">Registered Customers</div>
          </div>
        </div>

        <div className="admin-quick-stat-box">
          <div className="admin-quick-stat-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
            <StoreIcon size={20} />
          </div>
          <div>
            <div className="admin-quick-stat-number">{vendorStats.totalVendors ?? 0}</div>
            <div className="admin-quick-stat-name">Partner Print Hubs ({vendorStats.activeVendors ?? 0} Open)</div>
          </div>
        </div>

        <div className="admin-quick-stat-box">
          <div className="admin-quick-stat-icon" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
            <PackageIcon size={20} />
          </div>
          <div>
            <div className="admin-quick-stat-number">{orderStats.total}</div>
            <div className="admin-quick-stat-name">Total Orders Processed</div>
          </div>
        </div>

        <div className="admin-quick-stat-box">
          <div className="admin-quick-stat-icon" style={{ background: "#fffbeb", color: "#f59e0b" }}>
            <PrinterIcon size={20} />
          </div>
          <div>
            <div className="admin-quick-stat-number">{orderStats.queued + orderStats.inProgress}</div>
            <div className="admin-quick-stat-name">In Print Pipeline ({orderStats.ready} Ready)</div>
          </div>
        </div>

        <div className="admin-quick-stat-box">
          <div className="admin-quick-stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
            <CheckCircleIcon size={20} />
          </div>
          <div>
            <div className="admin-quick-stat-number">{orderStats.completed}</div>
            <div className="admin-quick-stat-name">Fulfilled Pickups</div>
          </div>
        </div>
      </div>

      {/* ── Financial Metrics Grid ── */}
      <div className="admin-metrics-grid">
        <div className="admin-metric-card blue">
          <div className="admin-metric-top">
            <span className="admin-metric-label">Gross Platform Revenue</span>
            <div className="admin-metric-icon">
              <RupeeIcon size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: "var(--admin-brand-blue)" }}>
            ₹{revenue.totalRevenue.toLocaleString("en-IN")}
          </div>
          <div className="admin-metric-hint">Cumulative gross order payments</div>
        </div>

        <div className="admin-metric-card green">
          <div className="admin-metric-top">
            <span className="admin-metric-label">Net Settled Revenue</span>
            <div className="admin-metric-icon">
              <CheckCircleIcon size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: "#10b981" }}>
            ₹{revenue.netRevenue.toLocaleString("en-IN")}
          </div>
          <div className="admin-metric-hint">Gross minus customer refunds</div>
        </div>

        <div className="admin-metric-card purple">
          <div className="admin-metric-top">
            <span className="admin-metric-label">Platform Margin (10%)</span>
            <div className="admin-metric-icon">
              <PercentIcon size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: "#8b5cf6" }}>
            ₹{revenue.platformCommission.toLocaleString("en-IN")}
          </div>
          <div className="admin-metric-hint">QuickPrint platform commission</div>
        </div>

        <div className="admin-metric-card amber">
          <div className="admin-metric-top">
            <span className="admin-metric-label">Vendor Payouts (90%)</span>
            <div className="admin-metric-icon">
              <StoreIcon size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: "#f59e0b" }}>
            ₹{revenue.vendorPayouts.toLocaleString("en-IN")}
          </div>
          <div className="admin-metric-hint">Disbursements owed to print shops</div>
        </div>

        <div className="admin-metric-card red">
          <div className="admin-metric-top">
            <span className="admin-metric-label">Refunded Amount</span>
            <div className="admin-metric-icon">
              <AlertTriangleIcon size={18} />
            </div>
          </div>
          <div className="admin-metric-value" style={{ color: "#ef4444" }}>
            ₹{revenue.refundedAmount.toLocaleString("en-IN")}
          </div>
          <div className="admin-metric-hint">
            {orderStats.cancelled} cancelled orders ({cancellation.cancellationRate} rate)
          </div>
        </div>
      </div>

      {/* ── 7-Day & 30-Day Revenue Trend Chart ── */}
      <RevenueTrendChart
        dailyTrends={analytics?.dailyTrends || []}
        monthlyTrends={analytics?.monthlyTrends || []}
      />

      {/* ── Recent Orders Widget ── */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">
              <PackageIcon size={20} color="var(--admin-brand-blue)" />
              Recent System Orders
            </h3>
            <p className="admin-card-subtitle">
              Latest transactions across all student portals and print stations
            </p>
          </div>

          <button
            type="button"
            className="admin-btn-action"
            onClick={onViewAllOrders}
          >
            View All Orders ({orders.length}) →
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">
              <PackageIcon size={24} />
            </div>
            <div className="admin-empty-title">No Orders Placed Yet</div>
            <p className="admin-empty-description">
              As soon as users upload documents and place orders, they will show up here in real-time.
            </p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Print Shop</th>
                  <th>Specs</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date &amp; Time</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--admin-brand-blue)" }}>
                        #{o.orderCode || o.orderId.slice(-4).toUpperCase()}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--admin-text-subtle)" }}>
                        {o.orderId.slice(0, 8)}...
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.userName || "Customer"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                        {o.userEmail || o.userId}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.vendorName || "Print Hub"}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.82rem" }}>
                        {o.serviceType || "Print"} • {o.pageCount || 1} pgs × {o.quantity || 1} cpy
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--admin-text-subtle)" }}>
                        {o.color || "B&W"} • {o.sides || "Single"}
                      </div>
                    </td>
                    <td>
                      <strong style={{ fontSize: "0.92rem", color: "var(--admin-text-main)" }}>
                        ₹{o.estimatedPrice || 0}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-pill ${o.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
                        {new Date(o.createdAt || Date.now()).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--admin-text-subtle)" }}>
                        {new Date(o.createdAt || Date.now()).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="admin-btn-action"
                        onClick={() => onViewOrder(o)}
                        title="View Full Order Details"
                      >
                        <EyeIcon size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
