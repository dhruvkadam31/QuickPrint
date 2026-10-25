import { useState, useMemo } from "react";
import { StoreIcon, UsersIcon, SearchIcon, PlusIcon, EyeIcon, RupeeIcon, CheckCircleIcon } from "./AdminIcons";
import toast from "react-hot-toast";
import { vendorRegister, toggleShopStatus } from "../../services/api";

export default function PartnerVendorsTab({
  vendors = [],
  loading = false,
  onRefresh,
  onViewVendor,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  // New Vendor Form State
  const [formName, setFormName] = useState("");
  const [formShopName, setFormShopName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        (v) =>
          (v.name && v.name.toLowerCase().includes(q)) ||
          (v.shopName && v.shopName.toLowerCase().includes(q)) ||
          (v.ownerName && v.ownerName.toLowerCase().includes(q)) ||
          (v.email && v.email.toLowerCase().includes(q)) ||
          (v.phone && v.phone.toLowerCase().includes(q))
      );
    }

    if (statusFilter === "OPEN") {
      result = result.filter((v) => v.shopOpen !== false);
    } else if (statusFilter === "CLOSED") {
      result = result.filter((v) => v.shopOpen === false);
    }

    return result;
  }, [vendors, searchTerm, statusFilter]);

  const openCount = vendors.filter((v) => v.shopOpen !== false).length;
  const closedCount = vendors.length - openCount;

  const handleToggleShop = async (vendor) => {
    const id = vendor.vendorId || vendor._id;
    setTogglingId(id);
    try {
      const newStatus = !(vendor.shopOpen !== false);
      await toggleShopStatus(id, newStatus);
      toast.success(`${vendor.shopName || vendor.name} is now ${newStatus ? "Open" : "Closed"}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to toggle vendor status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!formName || !formShopName || !formEmail || !formPassword) {
      toast.error("Please fill in all required vendor credentials");
      return;
    }
    if (formPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreating(true);
    try {
      await vendorRegister({
        name: formName,
        shopName: formShopName,
        email: formEmail,
        password: formPassword,
        phone: formPhone,
      });
      toast.success("Vendor shop registered successfully! 🎉");
      setFormName("");
      setFormShopName("");
      setFormEmail("");
      setFormPassword("");
      setFormPhone("");
      setShowCreateForm(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to register vendor");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-card">
        <div className="skeleton-box" style={{ height: 44, width: "100%", marginBottom: 16 }} />
        <div className="skeleton-box" style={{ height: 300, width: "100%" }} />
      </div>
    );
  }

  return (
    <div>
      {/* ── Top Summary Cards ── */}
      <div className="admin-quick-stats">
        <div className="admin-quick-stat-box">
          <div className="admin-quick-stat-icon" style={{ background: "#eff6ff", color: "var(--admin-brand-blue)" }}>
            <StoreIcon size={20} />
          </div>
          <div>
            <div className="admin-quick-stat-number">{vendors.length}</div>
            <div className="admin-quick-stat-name">Total Registered Hubs</div>
          </div>
        </div>

        <div className="admin-quick-stat-box">
          <div className="admin-quick-stat-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
            <CheckCircleIcon size={20} />
          </div>
          <div>
            <div className="admin-quick-stat-number">{openCount}</div>
            <div className="admin-quick-stat-name">Accepting Orders Now</div>
          </div>
        </div>

        <div className="admin-quick-stat-box">
          <div className="admin-quick-stat-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
            <StoreIcon size={20} />
          </div>
          <div>
            <div className="admin-quick-stat-number">{closedCount}</div>
            <div className="admin-quick-stat-name">Offline or Closed</div>
          </div>
        </div>
      </div>

      {/* ── Registration Form Card ── */}
      {showCreateForm && (
        <div className="admin-card" style={{ border: "1.5px solid var(--admin-brand-blue)", background: "#ffffff" }}>
          <div className="admin-card-header">
            <div>
              <h3 className="admin-card-title">
                <PlusIcon size={18} color="var(--admin-brand-blue)" />
                Register New Partner Print Station
              </h3>
              <p className="admin-card-subtitle">
                Create login credentials and register a new campus printing franchise
              </p>
            </div>
            <button
              className="btn btn-gray"
              style={{ padding: "4px 10px", fontSize: "0.8rem" }}
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateVendor}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 18 }}>
              <div>
                <label className="input-label">Shop Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Campus Library Express"
                  value={formShopName}
                  onChange={(e) => setFormShopName(e.target.value)}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="input-label">Owner / Operator Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Ramesh Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="input-label">Vendor Login Email *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="e.g. libraryprint@campus.edu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="input-label">Temporary Password *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="At least 6 characters"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={creating}
                />
              </div>

              <div>
                <label className="input-label">Contact Phone</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 9876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  disabled={creating}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-gray"
                onClick={() => setShowCreateForm(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? "Registering Shop..." : "Complete Registration →"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Vendors Table Card ── */}
      <div className="admin-card">
        <div className="admin-card-header">
          <div>
            <h3 className="admin-card-title">
              <StoreIcon size={20} color="var(--admin-brand-blue)" />
              Partner Vendor Network
            </h3>
            <p className="admin-card-subtitle">
              Manage print stations, monitor availability, view pricing, and track partner payouts
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {!showCreateForm && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: "0.82rem", padding: "8px 14px", display: "inline-flex", gap: 6, alignItems: "center" }}
                onClick={() => setShowCreateForm(true)}
              >
                <PlusIcon size={16} /> Register New Vendor
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="admin-filters-bar">
          <div className="admin-search-box">
            <span className="admin-search-icon">
              <SearchIcon size={16} />
            </span>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by shop name, owner, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Stations ({vendors.length})</option>
              <option value="OPEN">Open Now ({openCount})</option>
              <option value="CLOSED">Closed ({closedCount})</option>
            </select>
          </div>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">
              <StoreIcon size={24} />
            </div>
            <div className="admin-empty-title">
              {searchTerm || statusFilter !== "ALL" ? "No Matching Vendors" : "No Partner Vendors Registered"}
            </div>
            <p className="admin-empty-description">
              {searchTerm || statusFilter !== "ALL"
                ? "Try searching with a different keyword or resetting status filters."
                : "Register the first partner print shop using the button above."}
            </p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Shop &amp; Operator</th>
                  <th>Availability</th>
                  <th>Contact Info</th>
                  <th>Pricing Rates</th>
                  <th>Orders Handled</th>
                  <th>Gross Revenue</th>
                  <th>Vendor Payout (90%)</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v) => {
                  const id = v.vendorId || v._id;
                  const isOpen = v.shopOpen !== false;
                  const isTogglingThis = togglingId === id;

                  return (
                    <tr key={id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--admin-text-main)", fontSize: "0.92rem" }}>
                          {v.shopName || v.name}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--admin-text-muted)" }}>
                          Owner: {v.ownerName || v.name}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <button
                            type="button"
                            className={`admin-btn-toggle ${isOpen ? "open" : "closed"}`}
                            onClick={() => handleToggleShop(v)}
                            disabled={isTogglingThis}
                            title="Click to toggle shop open/closed status"
                          >
                            {isTogglingThis ? (
                              "Updating..."
                            ) : isOpen ? (
                              <>● Open</>
                            ) : (
                              <>○ Closed</>
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.82rem", color: "#334155" }}>{v.email}</div>
                        <div style={{ fontSize: "0.74rem", color: "var(--admin-text-muted)" }}>
                          {v.phone || "No phone listed"}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.82rem" }}>
                          B&amp;W: <strong style={{ color: "var(--admin-brand-blue)" }}>₹{v.bwPrice ?? v.bwPricePerPage ?? 1.5}/pg</strong>
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#8b5cf6" }}>
                          Color: <strong>₹{v.colorPrice ?? v.colorPricePerPage ?? 5.0}/pg</strong>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{v.totalOrders ?? 0}</span> orders
                      </td>
                      <td>
                        <strong style={{ fontSize: "0.92rem", color: "var(--admin-text-main)" }}>
                          ₹{(v.totalRevenue || 0).toLocaleString("en-IN")}
                        </strong>
                      </td>
                      <td>
                        <strong style={{ color: "#10b981", fontSize: "0.92rem" }}>
                          ₹{(v.vendorEarnings || Math.round((v.totalRevenue || 0) * 0.9)).toLocaleString("en-IN")}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="admin-btn-action"
                          onClick={() => onViewVendor(v)}
                          title="View Vendor Profile & Settings"
                        >
                          <EyeIcon size={14} /> Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
