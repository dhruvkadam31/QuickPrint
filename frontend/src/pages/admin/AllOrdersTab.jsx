import { useState, useMemo } from "react";
import { PackageIcon, SearchIcon, EyeIcon, FilterIcon } from "./AdminIcons";

export default function AllOrdersTab({ orders = [], loading = false, onViewOrder }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter and sort logic
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        (o) =>
          (o.orderCode && o.orderCode.toLowerCase().includes(q)) ||
          (o.orderId && o.orderId.toLowerCase().includes(q)) ||
          (o.userName && o.userName.toLowerCase().includes(q)) ||
          (o.userEmail && o.userEmail.toLowerCase().includes(q)) ||
          (o.userId && o.userId.toLowerCase().includes(q)) ||
          (o.vendorName && o.vendorName.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Service filter
    if (serviceFilter !== "ALL") {
      result = result.filter((o) => o.serviceType === serviceFilter);
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      const priceA = a.estimatedPrice || 0;
      const priceB = b.estimatedPrice || 0;

      if (sortBy === "newest") return dateB - dateA;
      if (sortBy === "oldest") return dateA - dateB;
      if (sortBy === "price_high") return priceB - priceA;
      if (sortBy === "price_low") return priceA - priceB;
      return 0;
    });

    return result;
  }, [orders, searchTerm, statusFilter, serviceFilter, sortBy]);

  // Pagination calculation
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const currentOrders = filteredOrders.slice(startIndex, startIndex + pageSize);

  const statusCounts = useMemo(() => {
    const counts = { ALL: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  if (loading) {
    return (
      <div className="admin-card">
        <div className="skeleton-box" style={{ height: 44, width: "100%", marginBottom: 16 }} />
        <div className="skeleton-box" style={{ height: 350, width: "100%" }} />
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h3 className="admin-card-title">
            <PackageIcon size={20} color="var(--admin-brand-blue)" />
            Order Repository &amp; Lifecycle
          </h3>
          <p className="admin-card-subtitle">
            Search, filter, inspect specifications, and manage fulfillment across all student print jobs
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.82rem", color: "var(--admin-text-muted)" }}>
            Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders
          </span>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="admin-filters-bar">
        {/* Search Input */}
        <div className="admin-search-box">
          <span className="admin-search-icon">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by code, ID, customer name, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Status Select */}
          <select
            className="admin-filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Statuses ({statusCounts.ALL || 0})</option>
            <option value="Queued">Queued ({statusCounts.Queued || 0})</option>
            <option value="Printing">Printing ({statusCounts.Printing || 0})</option>
            <option value="Ready">Ready for Pickup ({statusCounts.Ready || 0})</option>
            <option value="Picked Up">Picked Up ({statusCounts["Picked Up"] || 0})</option>
            <option value="Cancelled">Cancelled ({statusCounts.Cancelled || 0})</option>
          </select>

          {/* Service Select */}
          <select
            className="admin-filter-select"
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Services</option>
            <option value="Print">Print</option>
            <option value="Lamination">Lamination</option>
            <option value="Binding">Binding</option>
            <option value="Photocopy">Photocopy</option>
          </select>

          {/* Sort Select */}
          <select
            className="admin-filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_high">Price: High to Low</option>
            <option value="price_low">Price: Low to High</option>
          </select>
        </div>
      </div>

      {/* ── Orders Table ── */}
      {filteredOrders.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">
            <PackageIcon size={24} />
          </div>
          <div className="admin-empty-title">
            {searchTerm || statusFilter !== "ALL" || serviceFilter !== "ALL"
              ? "No Matching Orders Found"
              : "No Orders in Database"}
          </div>
          <p className="admin-empty-description">
            {searchTerm || statusFilter !== "ALL" || serviceFilter !== "ALL"
              ? "Try adjusting your search criteria or resetting filters to see all available records."
              : "As soon as users upload documents and place print orders, they will show up in this ledger."}
          </p>
          {(searchTerm || statusFilter !== "ALL" || serviceFilter !== "ALL") && (
            <button
              className="btn btn-ghost"
              style={{ marginTop: 14, fontSize: "0.82rem", padding: "6px 14px" }}
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
                setServiceFilter("ALL");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Order</th>
                  <th>Customer</th>
                  <th>Print Shop</th>
                  <th>Service / Specs</th>
                  <th style={{ width: 100 }}>Amount</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 100 }}>Payment</th>
                  <th style={{ width: 140 }}>Placed At</th>
                  <th style={{ textAlign: "right", width: 90 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentOrders.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--admin-brand-blue)" }}>
                        #{o.orderCode || o.orderId.slice(-4).toUpperCase()}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--admin-text-subtle)", fontFamily: "monospace" }}>
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
                      <div style={{ fontWeight: 600, color: "#334155" }}>
                        {o.vendorName || "Campus Print Hub"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                        {o.serviceType || "Print"} • {o.pageCount || 1} pgs × {o.quantity || 1} cpy
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--admin-text-subtle)" }}>
                        {o.color || "B&W"} • {o.sides || "Single"}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--admin-text-main)", fontSize: "0.92rem" }}>
                        ₹{o.estimatedPrice || 0}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#8b5cf6" }}>
                        Fee: ₹{o.commission || Math.round((o.estimatedPrice || 0) * 0.1)}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${o.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      <span className={`payment-pill ${(o.paymentStatus || "paid").toLowerCase()}`}>
                        ● <span style={{ textTransform: "capitalize" }}>{o.paymentStatus || "Paid"}</span>
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "0.8rem", color: "var(--admin-text-muted)" }}>
                        {new Date(o.createdAt || Date.now()).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--admin-text-subtle)" }}>
                        {new Date(o.createdAt || Date.now()).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="admin-btn-action"
                        onClick={() => onViewOrder(o)}
                        title="View Full Order Details & Timeline"
                      >
                        <EyeIcon size={14} /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination Controls ── */}
          <div className="admin-pagination-bar">
            <div>
              Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} of {totalItems} orders
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>Per page:</span>
                <select
                  className="admin-filter-select"
                  style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="admin-pagination-actions">
                <button
                  className="admin-page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage <= 1}
                >
                  ← Prev
                </button>
                <span style={{ display: "flex", alignItems: "center", padding: "0 8px", fontWeight: 600 }}>
                  {validPage} / {totalPages}
                </span>
                <button
                  className="admin-page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage >= totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
