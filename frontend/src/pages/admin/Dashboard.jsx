import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getAdminAnalyticsSummary,
  getAllOrdersAdmin,
  getAllVendorsAdmin,
} from "../../services/api";
import "../../styles/admin.css";

import {
  ShieldIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  LogOutIcon,
  TrendingUpIcon,
  PackageIcon,
  StoreIcon,
} from "./AdminIcons";

import AnalyticsOverview from "./AnalyticsOverview";
import AllOrdersTab from "./AllOrdersTab";
import PartnerVendorsTab from "./PartnerVendorsTab";
import OrderDetailsModal from "./OrderDetailsModal";
import VendorDetailsModal from "./VendorDetailsModal";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Selected modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setLoadError(null);

    try {
      const [analyticsRes, ordersRes, vendorsRes] = await Promise.all([
        getAdminAnalyticsSummary().catch((err) => {
          console.warn("Analytics fetch error:", err.message);
          return { data: { success: false } };
        }),
        getAllOrdersAdmin().catch((err) => {
          console.warn("Orders fetch error:", err.message);
          return { data: [] };
        }),
        getAllVendorsAdmin().catch((err) => {
          console.warn("Vendors fetch error:", err.message);
          return { data: [] };
        }),
      ]);

      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.data);
      }

      if (Array.isArray(ordersRes.data)) {
        setOrders(ordersRes.data);
      }

      // Merge vendors from dedicated API and analytics stats
      if (Array.isArray(vendorsRes.data) && vendorsRes.data.length > 0) {
        const statsMap = {};
        (analyticsRes.data?.data?.vendorStats?.vendors || []).forEach((v) => {
          statsMap[String(v.vendorId)] = v;
        });

        const merged = vendorsRes.data.map((v) => {
          const stats = statsMap[String(v._id)] || {};
          return {
            ...v,
            vendorId: v._id,
            ownerName: v.name,
            totalOrders: stats.totalOrders ?? 0,
            totalRevenue: stats.totalRevenue ?? 0,
            vendorEarnings: stats.vendorEarnings ?? 0,
            bwPrice: v.bwPricePerPage ?? 1.5,
            colorPrice: v.colorPricePerPage ?? 5.0,
            bindingPrice: v.bindingPrice ?? 20.0,
          };
        });
        setVendorsList(merged);
      } else if (analyticsRes.data?.data?.vendorStats?.vendors) {
        setVendorsList(analyticsRes.data.data.vendorStats.vendors);
      }

      setLastUpdated(new Date());
    } catch (err) {
      setLoadError("Failed to synchronize admin intelligence. Showing cached records.");
      toast.error("Error updating dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("isAdmin");
    toast.success("Admin session terminated securely");
    navigate("/admin/login");
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleSelectVendor = (vendor) => {
    setSelectedVendor(vendor);
  };

  const vendors = vendorsList.length > 0
    ? vendorsList
    : (analytics?.vendorStats?.vendors || []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--admin-bg)" }}>
      {/* ── Top Navigation Bar ── */}
      <header className="admin-navbar">
        <div className="admin-nav-left">
          <div className="admin-logo-group">
            <span style={{ color: "#ef4444", display: "flex", alignItems: "center" }}>
              <ShieldIcon size={24} />
            </span>
            <span className="admin-brand-title">QuickPrint</span>
            <span className="admin-suite-badge">Admin Suite</span>
          </div>

          <div className="admin-pulse-pill">
            <span className="admin-pulse-dot" />
            <span>
              {refreshing
                ? "Syncing Live Data..."
                : lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "Live Operations"}
            </span>
          </div>
        </div>

        <div className="admin-nav-actions">
          <button
            type="button"
            className="admin-nav-link-btn"
            onClick={() => navigate("/upload")}
            title="Open Student Document Upload Portal"
          >
            Customer App <ExternalLinkIcon size={12} />
          </button>

          <button
            type="button"
            className="admin-nav-link-btn"
            onClick={() => navigate("/vendor/dashboard")}
            title="Open Vendor Printing Queue Portal"
          >
            Vendor Portal <ExternalLinkIcon size={12} />
          </button>

          <button
            type="button"
            className="admin-logout-btn"
            onClick={handleLogout}
            title="Sign out of Administrator Session"
          >
            <LogOutIcon size={14} /> Logout
          </button>
        </div>
      </header>

      {/* ── Secondary Subnav & Tabs ── */}
      <nav className="admin-subnav-bar">
        <div className="admin-tabs-list">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <TrendingUpIcon size={16} />
            <span>Analytics Overview</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <PackageIcon size={16} />
            <span>All Orders</span>
            <span className="admin-tab-count">{orders.length}</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "vendors" ? "active" : ""}`}
            onClick={() => setActiveTab("vendors")}
          >
            <StoreIcon size={16} />
            <span>Partner Vendors</span>
            <span className="admin-tab-count">{vendors.length}</span>
          </button>
        </div>

        <div>
          <button
            type="button"
            className={`admin-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => loadData(false)}
            disabled={refreshing}
            title="Trigger Manual Data Synchronization"
          >
            <RefreshCwIcon size={14} />
            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </nav>

      {/* ── Main Container ── */}
      <main className="admin-container">
        {loadError && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              color: "#92400e",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.85rem",
            }}
          >
            <span>⚠️ {loadError}</span>
            <button
              className="btn btn-ghost"
              style={{ fontSize: "0.78rem", padding: "4px 10px", borderColor: "#d97706", color: "#92400e" }}
              onClick={() => loadData(false)}
            >
              Retry
            </button>
          </div>
        )}

        {activeTab === "overview" && (
          <AnalyticsOverview
            analytics={analytics}
            orders={orders}
            loading={loading && !analytics}
            onViewOrder={handleSelectOrder}
            onViewAllOrders={() => setActiveTab("orders")}
          />
        )}

        {activeTab === "orders" && (
          <AllOrdersTab
            orders={orders}
            loading={loading && orders.length === 0}
            onViewOrder={handleSelectOrder}
          />
        )}

        {activeTab === "vendors" && (
          <PartnerVendorsTab
            vendors={vendors}
            loading={loading && vendors.length === 0}
            onRefresh={() => loadData(true)}
            onViewVendor={handleSelectVendor}
          />
        )}
      </main>

      {/* ── Modals ── */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefresh={() => loadData(true)}
        />
      )}

      {selectedVendor && (
        <VendorDetailsModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onRefresh={() => loadData(true)}
        />
      )}
    </div>
  );
}
