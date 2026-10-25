import { useEffect, useState } from "react";
import { XIcon, StoreIcon, UsersIcon, RupeeIcon, CheckCircleIcon, PrinterIcon } from "./AdminIcons";
import toast from "react-hot-toast";
import { toggleShopStatus } from "../../services/api";

export default function VendorDetailsModal({ vendor, onClose, onRefresh }) {
  const [toggling, setToggling] = useState(false);
  const [isOpen, setIsOpen] = useState(vendor?.shopOpen !== false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!vendor) return null;

  const handleToggle = async () => {
    setToggling(true);
    try {
      const newStatus = !isOpen;
      await toggleShopStatus(vendor.vendorId || vendor._id, newStatus);
      setIsOpen(newStatus);
      toast.success(`Shop is now ${newStatus ? "Open" : "Closed"}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update shop status");
    } finally {
      setToggling(false);
    }
  };

  const id = vendor.vendorId || vendor._id;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 className="admin-modal-title">
                {vendor.shopName || vendor.name || "Vendor Shop"}
              </h3>
              <span className={`status-pill ${isOpen ? "ready" : "cancelled"}`}>
                {isOpen ? "● Open for Orders" : "○ Currently Closed"}
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", margin: "4px 0 0 0" }}>
              ID: {id} • {vendor.isOnline ? "🟢 Device Online" : "⚪ Device Offline"}
            </p>
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <XIcon size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Shop & Contact Profile */}
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-item-label">Owner / Manager</div>
              <div className="detail-item-value">{vendor.ownerName || vendor.name}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", marginTop: 2 }}>
                {vendor.email}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-item-label">Contact Phone</div>
              <div className="detail-item-value">{vendor.phone || "Not specified"}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--admin-text-subtle)", marginTop: 2 }}>
                Registered on {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString("en-IN") : "Platform Launch"}
              </div>
            </div>
          </div>

          {/* Pricing Rates */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--admin-text-main)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Current Pricing Structure
            </h4>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item-label">B&W Rate</div>
                <div className="detail-item-value" style={{ color: "var(--admin-brand-blue)" }}>
                  ₹{vendor.bwPrice ?? vendor.bwPricePerPage ?? 1.50} / page
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Color Rate</div>
                <div className="detail-item-value" style={{ color: "#8b5cf6" }}>
                  ₹{vendor.colorPrice ?? vendor.colorPricePerPage ?? 5.00} / page
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Binding Rate</div>
                <div className="detail-item-value" style={{ color: "#f59e0b" }}>
                  ₹{vendor.bindingPrice ?? 20.00} / book
                </div>
              </div>
            </div>
          </div>

          {/* Capacity & Equipment */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--admin-text-main)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Hardware & ML Queue Specifications
            </h4>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item-label">Active Printers</div>
                <div className="detail-item-value">{vendor.activePrinters ?? 1} Units</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Print Speed</div>
                <div className="detail-item-value">{vendor.printerSpeedPpm ?? 30} PPM</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Exam Rush Mode</div>
                <div className="detail-item-value">
                  {vendor.isExamPeriod ? "🔥 High Traffic Surge" : "Standard Academic"}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue & Performance */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--admin-text-main)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Performance & Revenue History
            </h4>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item-label">Lifetime Orders</div>
                <div className="detail-item-value">{vendor.totalOrders ?? 0} jobs</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Gross Revenue</div>
                <div className="detail-item-value" style={{ color: "var(--admin-brand-blue)" }}>
                  ₹{vendor.totalRevenue ?? 0}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Vendor Payout (90%)</div>
                <div className="detail-item-value" style={{ color: "#10b981" }}>
                  ₹{vendor.vendorEarnings ?? Math.round((vendor.totalRevenue || 0) * 0.9)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="admin-modal-footer">
          <button className="btn btn-gray" onClick={onClose}>
            Close
          </button>
          <button
            className={`btn ${isOpen ? "btn-danger" : "btn-success"}`}
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling ? "Updating Status..." : isOpen ? "Force Close Shop" : "Open Shop Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
