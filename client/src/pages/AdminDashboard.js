// src/pages/AdminDashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import NavBar from "../components/NavBar";

export default function AdminDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [shopOpen, setShopOpen] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  // Fetch orders every 5 seconds
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get("http://localhost:5000/queue");
        setOrders(res.data);
      } catch (err) {
        console.error("Fetch orders error:", err.response?.data || err.message);
      }
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load available printers (simulated)
  useEffect(() => {
    // In real implementation, this would fetch from system/backend
    const printers = [
      { id: "printer1", name: "HP LaserJet Pro M404dn", location: "Counter 1" },
      { id: "printer2", name: "Canon imageCLASS LBP623Cdw", location: "Counter 2" },
      { id: "printer3", name: "Epson WorkForce WF-2860", location: "Back Office" },
      { id: "printer4", name: "Brother HL-L8360CDW", location: "Color Station" }
    ];
    setAvailablePrinters(printers);
    setSelectedPrinter(printers[0]?.id || "");
  }, []);

  // Toggle shop open/close
  const toggleShop = async () => {
    try {
      const newStatus = !shopOpen;
      setShopOpen(newStatus);
      await axios.post("http://localhost:5000/shop-status", { open: newStatus });
    } catch (err) {
      console.error("Toggle shop error:", err.response?.data || err.message);
    }
  };

  // Update order status
  const updateStatus = async (orderId, status) => {
    try {
      const res = await axios.patch(`http://localhost:5000/orders/${orderId}`, { status });
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status: res.data.order.status } : o))
      );
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
    }
  };

  // Handle print button click
  const handlePrintClick = (order) => {
    setSelectedOrder(order);
    setShowPrintDialog(true);
  };

  // Execute print job
  const handlePrintExecute = async () => {
    if (!selectedOrder || !selectedPrinter) {
      alert("Please select a printer");
      return;
    }

    try {
      // Send print job to backend
      const printData = {
        orderId: selectedOrder.orderId,
        printerId: selectedPrinter,
        fileUrl: selectedOrder.fileUrl,
        printConfig: {
          copies: selectedOrder.quantity || 1,
          color: selectedOrder.color || "B&W",
          sides: selectedOrder.sides || "Single",
          orientation: selectedOrder.orientation || "Portrait",
          pageRange: "all"
        }
      };

      const response = await axios.post("http://localhost:5000/print", printData);
      
      if (response.data.success) {
        alert(`Print job sent to printer successfully!`);
        // Update order status to "In Progress"
        await updateStatus(selectedOrder.orderId, "In Progress");
        setShowPrintDialog(false);
        setSelectedOrder(null);
      } else {
        alert("Print failed: " + response.data.error);
      }
    } catch (error) {
      console.error("Print error:", error);
      alert("Print failed: " + (error.response?.data?.error || error.message));
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "Queued": return { bg: "#e0f2fe", color: "#0369a1" };
      case "In Progress": return { bg: "#fef3c7", color: "#92400e" };
      case "Ready": return { bg: "#d1fae5", color: "#065f46" };
      case "Picked Up": return { bg: "#f3f4f6", color: "#374151" };
      default: return { bg: "#f3f4f6", color: "#374151" };
    }
  };

  // Filter orders
  const queuedOrders = orders.filter((o) => o.status === "Queued");
  const inProgressOrders = orders.filter((o) => o.status === "In Progress");
  const readyOrders = orders.filter((o) => o.status === "Ready");
  const completedOrders = orders.filter((o) => o.status === "Picked Up");

  return (
    <div>
      {user && <NavBar user={user} />}

      <div className="page-wrapper">
        <div className="card">
          <h2>Admin Dashboard</h2>

          {/* Shop Start/Stop */}
          <button
            onClick={toggleShop}
            style={{
              background: shopOpen ? "#10b981" : "#ef4444",
              color: "#fff",
              padding: "8px 16px",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            {shopOpen ? "Shop Open (Stop)" : "Shop Closed (Start)"}
          </button>

          {/* Queued Orders - Ready to Print */}
          <h3>Queued Orders ({queuedOrders.length})</h3>
          <div className="orders-list">
            {queuedOrders.length === 0 && <div className="small-muted">No queued orders</div>}
            {queuedOrders.map((o) => {
              const statusStyle = getStatusColor(o.status);
              return (
                <div key={o.orderId} className="order-item space-between">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <b>#{o.orderId}</b>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: 4, 
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontSize: "0.75em",
                        fontWeight: 600
                      }}>
                        {o.status}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: 8 }}>
                      <strong>{o.serviceType}</strong> • {o.quantity} copies • {o.totalPages || o.pageCount} pages
                    </div>
                    
                    <div className="small-muted" style={{ marginBottom: 4 }}>
                      Client: {o.userId}
                    </div>
                    
                    {/* Print Configuration */}
                    <div style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: 8, 
                      borderRadius: 6,
                      marginBottom: 8,
                      fontSize: '0.85em'
                    }}>
                      <strong>Print Settings:</strong> {o.color} • {o.sides} • {o.orientation}
                      {o.instructions && (
                        <div style={{ marginTop: 4 }}>
                          <strong>Instructions:</strong> {o.instructions}
                        </div>
                      )}
                    </div>

                    {o.fileUrl && (
                      <div className="small-muted">
                        <a href={o.fileUrl} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
                          📄 View File
                        </a>
                        <a href={o.fileUrl} download target="_blank" rel="noreferrer">
                          ⬇️ Download
                        </a>
                      </div>
                    )}
                    
                    <div className="small-muted">
                      Created: {new Date(o.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
                    <button
                      className="btn-primary"
                      onClick={() => handlePrintClick(o)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      🖨️ Print
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => updateStatus(o.orderId, "In Progress")}
                    >
                      Start Processing
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* In Progress Orders */}
          <h3 style={{ marginTop: 24 }}>In Progress ({inProgressOrders.length})</h3>
          <div className="orders-list">
            {inProgressOrders.length === 0 && <div className="small-muted">No orders in progress</div>}
            {inProgressOrders.map((o) => {
              const statusStyle = getStatusColor(o.status);
              return (
                <div key={o.orderId} className="order-item space-between">
                  <div>
                    <b>#{o.orderId}</b> {o.serviceType} • {o.quantity} copies • {o.totalPages || o.pageCount} pages
                    <div className="small-muted">{o.userId}</div>
                    <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: 4 }}>
                      <strong>Settings:</strong> {o.color} • {o.sides} • {o.orientation}
                    </div>
                    {o.fileUrl && (
                      <div className="small-muted">
                        <a href={o.fileUrl} target="_blank" rel="noreferrer">
                          View File
                        </a>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ 
                      padding: "6px 12px", 
                      borderRadius: 6, 
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      fontSize: "0.85em",
                      fontWeight: 600
                    }}>
                      {o.status}
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => updateStatus(o.orderId, "Ready")}
                    >
                      Mark as Ready
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => handlePrintClick(o)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      🖨️ Reprint
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ready Orders */}
          <h3 style={{ marginTop: 24 }}>Ready for Pickup ({readyOrders.length})</h3>
          <div className="orders-list">
            {readyOrders.length === 0 && <div className="small-muted">No orders ready for pickup</div>}
            {readyOrders.map((o) => {
              const statusStyle = getStatusColor(o.status);
              return (
                <div key={o.orderId} className="order-item space-between">
                  <div>
                    <b>#{o.orderId}</b> {o.serviceType} • {o.quantity} copies • {o.totalPages || o.pageCount} pages
                    <div className="small-muted">{o.userId}</div>
                    {o.fileUrl && (
                      <div className="small-muted">
                        <a href={o.fileUrl} target="_blank" rel="noreferrer">
                          View File
                        </a>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ 
                      padding: "6px 12px", 
                      borderRadius: 6, 
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      fontSize: "0.85em",
                      fontWeight: 600
                    }}>
                      Ready ✅
                    </div>
                    <button
                      className="btn-ghost"
                      onClick={() => updateStatus(o.orderId, "Picked Up")}
                    >
                      Mark as Picked Up
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completed Orders */}
          <h3 style={{ marginTop: 24 }}>Completed Orders ({completedOrders.length})</h3>
          <div className="orders-list">
            {completedOrders.length === 0 && <div className="small-muted">No completed orders</div>}
            {completedOrders.map((o) => {
              const statusStyle = getStatusColor(o.status);
              return (
                <div key={o.orderId} className="order-item space-between">
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {o.serviceType} • {o.quantity} copies • {o.totalPages || o.pageCount} pages
                    </div>
                    <div className="small-muted">{o.userId}</div>
                    {o.fileUrl && (
                      <div className="small-muted">
                        <a href={o.fileUrl} target="_blank" rel="noreferrer">
                          View File
                        </a>
                      </div>
                    )}
                    <div className="small-muted">
                      Completed: {o.pickedUpAt ? new Date(o.pickedUpAt).toLocaleString() : new Date(o.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>₹{o.estimatedPrice}</div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ 
                        padding: "6px 12px", 
                        borderRadius: 6, 
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontSize: "0.85em",
                        fontWeight: 600
                      }}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Print Dialog Modal */}
      {showPrintDialog && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 12,
            maxWidth: 500,
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginBottom: 20 }}>🖨️ Print Order #{selectedOrder.orderId}</h3>
            
            {/* Order Summary */}
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: 16, 
              borderRadius: 8,
              marginBottom: 20
            }}>
              <h4 style={{ marginBottom: 12 }}>Order Details</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Service Type:</span>
                  <strong>{selectedOrder.serviceType}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Copies:</span>
                  <strong>{selectedOrder.quantity}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Pages:</span>
                  <strong>{selectedOrder.totalPages || selectedOrder.pageCount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Color:</span>
                  <strong>{selectedOrder.color || 'B&W'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sides:</span>
                  <strong>{selectedOrder.sides || 'Single'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Orientation:</span>
                  <strong>{selectedOrder.orientation || 'Portrait'}</strong>
                </div>
                {selectedOrder.instructions && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Instructions:</span>
                    <strong style={{ textAlign: 'right' }}>{selectedOrder.instructions}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Printer Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                Select Printer:
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  fontSize: '1em'
                }}
              >
                <option value="">Choose a printer...</option>
                {availablePrinters.map(printer => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name} ({printer.location})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPrintDialog(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePrintExecute}
                disabled={!selectedPrinter}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedPrinter ? '#1e3a8a' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: selectedPrinter ? 'pointer' : 'not-allowed',
                  fontWeight: 600
                }}
              >
                🖨️ Send to Printer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}