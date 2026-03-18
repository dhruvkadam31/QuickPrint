// src/components/vendor/PrintModal.js
import React, { useState } from "react";

export default function PrintModal({ order, printers, onClose, onPrint, loading }) {
  const [selectedPrinter, setSelectedPrinter] = useState("");

  const compatiblePrinters = printers.filter(printer => {
    const supportsColor = order.color !== "Color" || printer.supportsColor;
    const supportsDuplex = order.sides !== "Double" || printer.supportsDuplex;
    return supportsColor && supportsDuplex && printer.status === "online";
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">🖨️ Print Order</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ marginBottom: "10px", color: "#1e293b" }}>Order Summary</h3>
          <div style={{ 
            background: "#f8fafc", 
            padding: "15px", 
            borderRadius: "10px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px"
          }}>
            <div><strong>Service:</strong> {order.serviceType}</div>
            <div><strong>Copies:</strong> {order.quantity}</div>
            <div><strong>Pages:</strong> {order.totalPages || order.pageCount}</div>
            <div><strong>Color:</strong> {order.color || "B&W"}</div>
            <div><strong>Sides:</strong> {order.sides || "Single"}</div>
            <div><strong>Orientation:</strong> {order.orientation || "Portrait"}</div>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
            Select Printer:
          </label>
          <select 
            className="printer-select"
            value={selectedPrinter}
            onChange={(e) => setSelectedPrinter(e.target.value)}
          >
            <option value="">Choose a printer...</option>
            {compatiblePrinters.map(printer => (
              <option key={printer.id} value={printer.id}>
                {printer.name} - {printer.location} 
                {printer.supportsColor ? " (Color)" : " (B&W)"}
                {printer.supportsDuplex ? " (Duplex)" : ""}
              </option>
            ))}
          </select>
        </div>

        {compatiblePrinters.length === 0 && (
          <div style={{ 
            background: "#fee2e2", 
            color: "#991b1b", 
            padding: "12px", 
            borderRadius: "8px",
            marginBottom: "20px"
          }}>
            ⚠️ No compatible printers available for this order's requirements.
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button 
            className="action-btn"
            style={{ background: "#64748b", color: "white" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="action-btn print-btn"
            onClick={() => onPrint(order, selectedPrinter)}
            disabled={!selectedPrinter || loading}
            style={{ 
              opacity: (!selectedPrinter || loading) ? 0.5 : 1,
              cursor: (!selectedPrinter || loading) ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "🔄 Printing..." : "🖨️ Send to Printer"}
          </button>
        </div>
      </div>
    </div>
  );
}