// src/components/vendor/OrderCard.js
import React from "react";

export default function OrderCard({ order, onStatusChange, onPrintClick }) {
  const getBadgeClass = (status) => {
    switch (status) {
      case "Queued": return "badge-queued";
      case "In Progress": return "badge-progress";
      case "Ready": return "badge-ready";
      case "Picked Up": return "badge-completed";
      default: return "";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Queued": return "⏳";
      case "In Progress": return "🔄";
      case "Ready": return "✅";
      case "Picked Up": return "📦";
      default: return "📄";
    }
  };

  return (
    <div className="order-card">
      <div className="order-header">
        <div className="order-id">Order #{order.orderId.slice(-8)}</div>
        <div className="order-time">{new Date(order.createdAt).toLocaleString()}</div>
        <span className={`order-badge ${getBadgeClass(order.status)}`}>
          {getStatusIcon(order.status)} {order.status}
        </span>
      </div>

      <div className="order-details">
        <div className="detail-item">
          <div className="detail-label">Service</div>
          <div className="detail-value">{order.serviceType}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Copies</div>
          <div className="detail-value">{order.quantity}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Pages</div>
          <div className="detail-value">{order.totalPages || order.pageCount}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Color</div>
          <div className="detail-value">{order.color || "B&W"}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Sides</div>
          <div className="detail-value">{order.sides || "Single"}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Orientation</div>
          <div className="detail-value">{order.orientation || "Portrait"}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Price</div>
          <div className="detail-value">₹{order.estimatedPrice}</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Commission</div>
          <div className="detail-value">₹{(order.estimatedPrice * 0.1).toFixed(2)}</div>
        </div>
      </div>

      {order.instructions && (
        <div style={{ 
          background: "#fff3cd", 
          padding: "10px 15px", 
          borderRadius: "8px",
          marginBottom: "15px",
          fontSize: "0.9rem",
          color: "#856404"
        }}>
          <strong>📝 Instructions:</strong> {order.instructions}
        </div>
      )}

      <div className="order-actions">
        {order.status === "Queued" && (
          <>
            <button 
              className="action-btn print-btn"
              onClick={onPrintClick}
            >
              🖨️ Print Now
            </button>
            <button 
              className="action-btn progress-btn"
              onClick={() => onStatusChange(order.orderId, "In Progress")}
            >
              Start Processing
            </button>
          </>
        )}

        {order.status === "In Progress" && (
          <button 
            className="action-btn ready-btn"
            onClick={() => onStatusChange(order.orderId, "Ready")}
          >
            ✅ Mark as Ready
          </button>
        )}

        {order.status === "Ready" && (
          <button 
            className="action-btn"
            style={{ background: "#64748b", color: "white" }}
            onClick={() => onStatusChange(order.orderId, "Picked Up")}
          >
            📦 Mark as Picked Up
          </button>
        )}

        {order.fileUrl && (
          <a 
            href={order.fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="action-btn"
            style={{ background: "#6b7280", color: "white", textDecoration: "none" }}
          >
            📄 View File
          </a>
        )}
      </div>
    </div>
  );
}