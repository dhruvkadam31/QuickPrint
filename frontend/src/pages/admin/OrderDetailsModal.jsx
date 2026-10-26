import { useEffect, useState } from "react";
import { XIcon, PackageIcon, PrinterIcon, UsersIcon, RupeeIcon, CheckCircleIcon, AlertTriangleIcon } from "./AdminIcons";
import toast from "react-hot-toast";
import { updateOrderStatus, cancelOrder } from "../../services/api";

export default function OrderDetailsModal({ order, onClose, onRefresh }) {
  const [updating, setUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!order) return null;

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await updateOrderStatus(order.orderId, newStatus);
      toast.success(`Order marked as ${newStatus}`);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for administrative cancellation");
      return;
    }
    setCancelling(true);
    try {
      await cancelOrder(order.orderId, { cancellationReason: `[Admin] ${cancelReason.trim()}` });
      toast.success("Order cancelled and refund processed if eligible");
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const filesList = Array.isArray(order.files) && order.files.length > 0
    ? order.files
    : [{ originalName: order.originalFileName || "Document", pageCount: order.pageCount, fileUrl: order.fileUrl }];

  const canCancel = order.status !== "Cancelled" && order.status !== "Picked Up";

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 className="admin-modal-title">
                Order #{order.orderCode || order.orderId.slice(-6).toUpperCase()}
              </h3>
              <span className={`status-pill ${order.status.toLowerCase().replace(/\s+/g, "-")}`}>
                {order.status}
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)", margin: "4px 0 0 0" }}>
              ID: {order.orderId} • Placed on {new Date(order.createdAt || Date.now()).toLocaleString("en-IN")}
            </p>
          </div>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <XIcon size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Customer & Vendor Info */}
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-item-label">Customer</div>
              <div className="detail-item-value">{order.userName || "Customer"}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>
                {order.userEmail || "No email available"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--admin-text-subtle)", marginTop: 2 }}>
                UID: {order.userId}
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-item-label">Fulfilling Print Shop</div>
              <div className="detail-item-value">{order.vendorName || "—"}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>
                Vendor ID: {String(order.vendorId)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--admin-text-subtle)", marginTop: 2 }}>
                Estimated Wait: ~{order.predictedWaitTime || 5} mins
              </div>
            </div>
          </div>

          {/* Files & Print Specifications */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--admin-text-main)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Print Specifications
            </h4>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item-label">Service Type</div>
                <div className="detail-item-value">{order.serviceType || "Standard Print"}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Volume</div>
                <div className="detail-item-value">
                  {order.pageCount || 1} pages × {order.quantity || 1} copies
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)" }}>
                  Total: {order.totalPages || (order.pageCount || 1) * (order.quantity || 1)} printed sides
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Color & Sides</div>
                <div className="detail-item-value">
                  {order.color || "B&W"} • {order.sides || "Single Sided"}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Orientation</div>
                <div className="detail-item-value">{order.orientation || "Portrait"}</div>
              </div>
            </div>

            {order.instructions && (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e", marginBottom: 2 }}>Customer Instructions:</div>
                <div style={{ fontSize: "0.85rem", color: "#78350f" }}>{order.instructions}</div>
              </div>
            )}

            {/* Document list */}
            <div style={{ background: "#f8fafc", border: "1px solid var(--admin-border)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--admin-text-muted)", marginBottom: 8, textTransform: "uppercase" }}>
                Attached Files ({filesList.length})
              </div>
              {filesList.map((f, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < filesList.length - 1 ? "1px solid #e2e8f0" : "none", fontSize: "0.84rem" }}>
                  <span style={{ fontWeight: 600, color: "#334155" }}>📄 {f.originalName || f.name || `Document_${i + 1}`}</span>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--admin-text-muted)" }}>{f.pageCount ? `${f.pageCount} pgs` : ""}</span>
                    {f.fileUrl && (
                      <a
                        href={f.fileUrl.startsWith("http") ? f.fileUrl : `http://localhost:5000${f.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--admin-brand-blue)", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}
                      >
                        Preview ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown & Settlements */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--admin-text-main)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Settlement & Pricing
            </h4>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-item-label">Amount Paid by Customer</div>
                <div className="detail-item-value" style={{ color: "var(--admin-brand-blue)", fontSize: "1.1rem" }}>
                  ₹{order.estimatedPrice || 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: 2 }}>
                  Status: <strong style={{ textTransform: "capitalize" }}>{order.paymentStatus || "Paid"}</strong>
                  {order.paymentId && ` (${order.paymentId.slice(-8)})`}
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Platform Margin (10%)</div>
                <div className="detail-item-value" style={{ color: "#8b5cf6" }}>
                  ₹{order.commission || Math.round((order.estimatedPrice || 0) * 0.1)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: 2 }}>
                  QuickPrint Platform fee
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Vendor Earnings (90%)</div>
                <div className="detail-item-value" style={{ color: "#10b981" }}>
                  ₹{order.vendorEarnings || Math.round((order.estimatedPrice || 0) * 0.9)}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--admin-text-muted)", marginTop: 2 }}>
                  Disbursed to print shop
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Pickup Verification</div>
                <div className="detail-item-value">
                  {order.otp ? `OTP: ${order.otp}` : "No OTP recorded"}
                </div>
                <div style={{ fontSize: "0.75rem", color: order.otpUsed ? "#10b981" : "#f59e0b", marginTop: 2 }}>
                  {order.otpUsed ? "✓ Verified & Picked Up" : "⏳ Pending OTP Verification"}
                </div>
              </div>
            </div>

            {/* Refund Information if applicable */}
            {(order.refundStatus || order.refundAmount) && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginTop: 10 }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#991b1b", marginBottom: 2 }}>Refund Record:</div>
                <div style={{ fontSize: "0.82rem", color: "#b91c1c" }}>
                  Amount Refunded: <strong>₹{order.refundAmount || order.estimatedPrice}</strong> • Refund ID: {order.refundId || "Manual / Offline"}
                </div>
              </div>
            )}

            {/* Cancellation reason if cancelled */}
            {order.status === "Cancelled" && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginTop: 10 }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#991b1b", marginBottom: 2 }}>Cancellation Detail:</div>
                <div style={{ fontSize: "0.82rem", color: "#b91c1c" }}>
                  Reason: {order.cancellationReason || "Customer cancelled"} • At: {new Date(order.cancelledAt || order.updatedAt).toLocaleString("en-IN")}
                </div>
              </div>
            )}
          </div>

          {/* Cancellation Form if admin clicks Cancel */}
          {showCancelConfirm && (
            <div style={{ background: "#fef2f2", border: "1.5px solid #ef4444", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#991b1b", fontSize: "0.9rem", marginBottom: 6 }}>
                ⚠️ Confirm Administrative Order Cancellation
              </div>
              <p style={{ fontSize: "0.82rem", color: "#7f1d1d", marginBottom: 12 }}>
                This will mark the order as Cancelled and trigger an automatic Razorpay refund if the order was paid online.
              </p>
              <input
                className="input"
                type="text"
                placeholder="Reason for cancellation (e.g. Printer maintenance, requested by user)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ marginBottom: 12 }}
                disabled={cancelling}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  className="btn btn-gray"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                  style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                >
                  Go Back
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleCancelOrder}
                  disabled={cancelling || !cancelReason.trim()}
                  style={{ fontSize: "0.8rem", padding: "6px 14px" }}
                >
                  {cancelling ? "Processing Refund..." : "Confirm Cancellation & Refund"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="admin-modal-footer">
          <button className="btn btn-gray" onClick={onClose} disabled={updating || cancelling}>
            Close
          </button>

          {canCancel && !showCancelConfirm && (
            <button
              className="btn btn-ghost"
              style={{ color: "#dc2626", borderColor: "#fca5a5" }}
              onClick={() => setShowCancelConfirm(true)}
              disabled={updating}
            >
              Cancel Order & Refund
            </button>
          )}

          {order.status === "Queued" && (
            <button
              className="btn btn-primary"
              onClick={() => handleStatusChange("Printing")}
              disabled={updating}
            >
              {updating ? "Updating..." : "Mark as Printing"}
            </button>
          )}

          {order.status === "Printing" && (
            <button
              className="btn btn-success"
              onClick={() => handleStatusChange("Ready")}
              disabled={updating}
            >
              {updating ? "Updating..." : "Mark as Ready for Pickup"}
            </button>
          )}

          {order.status === "Ready" && (
            <button
              className="btn btn-success"
              onClick={() => handleStatusChange("Picked Up")}
              disabled={updating}
            >
              {updating ? "Updating..." : "Mark as Picked Up"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
