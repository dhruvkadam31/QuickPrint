// src/pages/VendorDashboard.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import NavBar from "../components/NavBar";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function VendorDashboard() {
  const [orders, setOrders] = useState([]);
  const [availablePrinters, setAvailablePrinters] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [shopOpen, setShopOpen] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState({
    today: { total: 0, commission: 0, net: 0, ordersCount: 0 },
    weekly: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if vendor is logged in
    const vendorData = localStorage.getItem("vendorData");
    const isVendor = localStorage.getItem("isVendor") === "true";
    
    if (!isVendor || !vendorData) {
      navigate("/vendor_login");
      return;
    }

    setVendor(JSON.parse(vendorData));
    setShopOpen(JSON.parse(vendorData).shopOpen || true);
    
    fetchVendorOrders();
    fetchRevenueData();
  }, [navigate]);

  const fetchVendorOrders = async () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem("vendorData"));
      const res = await axios.get(`http://localhost:5000/vendors/${vendorData.vendorId}/orders`);
      setOrders(res.data);
      console.log("📦 Fetched vendor orders:", res.data);
    } catch (err) {
      console.error("Fetch orders error:", err);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem("vendorData"));
      const res = await axios.get(`http://localhost:5000/vendors/${vendorData.vendorId}/revenue`);
      setRevenueData(res.data);
    } catch (err) {
      console.error("Fetch revenue error:", err);
      // Generate mock data if endpoint doesn't exist
      generateMockRevenueData();
    }
  };

  const generateMockRevenueData = () => {
    const today = new Date();
    const weeklyData = [];
    
    // Generate last 7 days data
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dayRevenue = Math.floor(Math.random() * 500) + 100;
      const commission = dayRevenue * 0.10;
      const net = dayRevenue - commission;
      
      weeklyData.push({
        date: date.toISOString().split('T')[0],
        total: dayRevenue,
        commission: commission,
        net: net,
        ordersCount: Math.floor(Math.random() * 5) + 1
      });
    }

    // Today's revenue (last item in weekly data)
    const todayData = weeklyData[weeklyData.length - 1];
    
    setRevenueData({
      today: todayData,
      weekly: weeklyData
    });
  };

  // Load printers
  useEffect(() => {
    const printers = [
      { id: "printer1", name: "HP LaserJet Pro M404dn", location: "Counter 1", supportsColor: false, supportsDuplex: true },
      { id: "printer2", name: "Canon imageCLASS LBP623Cdw", location: "Counter 2", supportsColor: true, supportsDuplex: true },
      { id: "printer3", name: "Epson WorkForce WF-2860", location: "Back Office", supportsColor: true, supportsDuplex: true },
      { id: "printer4", name: "Brother HL-L8360CDW", location: "Color Station", supportsColor: true, supportsDuplex: true }
    ];
    setAvailablePrinters(printers);
  }, []);

  // Auto-refresh orders every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchVendorOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh revenue every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchRevenueData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debug function to check orders
  const debugOrders = async () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem("vendorData"));
      const response = await axios.get(`http://localhost:5000/debug/orders-by-vendor/${vendorData.vendorId}`);
      console.log("🔍 Debug - Vendor orders:", response.data);
    } catch (err) {
      console.error("Debug error:", err);
    }
  };

  // Call debug on component mount
  useEffect(() => {
    if (vendor) {
      debugOrders();
    }
  }, [vendor]);

  const handlePrintClick = (order) => {
    setSelectedOrder(order);
    setSelectedPrinter("");
    setShowPrintModal(true);
  };

  const handlePrint = async () => {
    if (!selectedPrinter) {
      alert("Please select a printer");
      return;
    }

    if (!selectedOrder) return;

    setLoading(true);

    // Get selected printer details
    const printer = availablePrinters.find(p => p.id === selectedPrinter);
    
    // Validate printer compatibility with order requirements
    if (selectedOrder.color === "Color" && !printer.supportsColor) {
      alert(`❌ ${printer.name} does not support color printing. Please select a color printer.`);
      setLoading(false);
      return;
    }

    if (selectedOrder.sides === "Double" && !printer.supportsDuplex) {
      alert(`❌ ${printer.name} does not support double-sided printing. Please select a duplex printer.`);
      setLoading(false);
      return;
    }

    try {
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
        alert(`✅ Print job sent to ${printer.name} successfully!`);
        // Update order status to "In Progress"
        await updateOrderStatus(selectedOrder.orderId, "In Progress");
        setShowPrintModal(false);
        setSelectedOrder(null);
        setSelectedPrinter("");
      } else {
        alert("❌ Print failed: " + response.data.error);
      }
    } catch (error) {
      console.error("Print error:", error);
      alert("❌ Print failed: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      console.log("🔄 Updating order status:", { orderId, status });
      
      // Try the main endpoint first
      let response;
      try {
        response = await axios.patch(`http://localhost:5000/orders/${orderId}`, { 
          status 
        });
      } catch (firstError) {
        console.log("⚠️ First endpoint failed, trying alternative...");
        
        // If first endpoint fails, try the alternative
        response = await axios.patch(`http://localhost:5000/orders/update-status`, {
          orderId: orderId,
          status: status
        });
      }
      
      console.log("✅ Status update response:", response.data);
      
      if (response.data.success) {
        // Success - refresh orders
        fetchVendorOrders();
        return true;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error("❌ Update failed:", err);
      
      if (err.response) {
        // Server responded with error status
        console.error("Server error response:", err.response.data);
        
        if (err.response.status === 404) {
          alert(`❌ Order not found. The order may have been deleted or the ID is incorrect.`);
          
          // Debug: Log all orders to see what's available
          console.log("📋 Available orders:", orders.map(o => ({
            orderId: o.orderId,
            status: o.status
          })));
        } else {
          alert(`Failed to update order status: ${err.response.data.error || err.response.statusText}`);
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error("No response received:", err.request);
        alert("Failed to update order status: Server is not responding");
      } else {
        // Something else happened
        console.error("Error:", err.message);
        alert("Failed to update order status: " + err.message);
      }
      return false;
    }
  };

  const toggleShopStatus = async () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem("vendorData"));
      const newStatus = !shopOpen;
      
      const response = await axios.patch(`http://localhost:5000/vendors/${vendorData.vendorId}/shop-status`, {
        shopOpen: newStatus
      });
      
      if (response.data.success) {
        setShopOpen(newStatus);
        
        // Update local storage
        const updatedVendor = { ...vendorData, shopOpen: newStatus };
        localStorage.setItem("vendorData", JSON.stringify(updatedVendor));
        setVendor(updatedVendor);
        
        toast.success(`Shop is now ${newStatus ? 'OPEN' : 'CLOSED'}`);
        
        // Force refresh vendors list on client side
        console.log("🔄 Shop status updated - clients will see change on next refresh");
      }
    } catch (err) {
      console.error("Toggle shop error:", err);
      toast.error("Failed to update shop status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Queued": return { bg: "#e0f2fe", color: "#0369a1" };
      case "In Progress": return { bg: "#fef3c7", color: "#92400e" };
      case "Ready": return { bg: "#d1fae5", color: "#065f46" };
      case "Picked Up": return { bg: "#f3f4f6", color: "#374151" };
      default: return { bg: "#f3f4f6", color: "#374151" };
    }
  };

  // Filter compatible printers based on order requirements
  const getCompatiblePrinters = (order) => {
    if (!order) return availablePrinters;
    
    return availablePrinters.filter(printer => {
      const supportsColor = order.color !== "Color" || printer.supportsColor;
      const supportsDuplex = order.sides !== "Double" || printer.supportsDuplex;
      return supportsColor && supportsDuplex;
    });
  };

  // Revenue Analytics Components
  

 

  // Add CSS for hover effects
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .revenue-card:hover .revenue-tooltip {
        opacity: 1 !important;
      }
      .chart-bar:hover .bar-tooltip {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!vendor) {
    return <div>Loading...</div>;
  }

  const queuedOrders = orders.filter((o) => o.status === "Queued");
  const inProgressOrders = orders.filter((o) => o.status === "In Progress");
  const readyOrders = orders.filter((o) => o.status === "Ready");
  const completedOrders = orders.filter((o) => o.status === "Picked Up");

  const compatiblePrinters = selectedOrder ? getCompatiblePrinters(selectedOrder) : [];

  return (
    <div>
      <NavBar user={vendor} />
      
      <div className="page-wrapper">
        <div className="card">
          <h2>Hello Vendor Dashboard - {vendor.name}</h2>
          
          {/* Revenue Analytics Section */}
          
          {/* Shop Status Toggle */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={toggleShopStatus}
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
              {shopOpen ? "🟢 Shop Open (Click to Close)" : "🔴 Shop Closed (Click to Open)"}
            </button>
            <p className="small-muted">
              {shopOpen 
                ? "Your shop is visible to customers and accepting orders" 
                : "Your shop is hidden from customers"
              }
            </p>
          </div>

          {/* Orders Summary */}
          <div style={{ 
            display: 'flex', 
            gap: 12, 
            marginBottom: 20,
            padding: 12,
            backgroundColor: '#f8f9fa',
            borderRadius: 8
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#0369a1' }}>{queuedOrders.length}</div>
              <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Queued</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#92400e' }}>{inProgressOrders.length}</div>
              <div style={{ fontSize: '0.8em', color: '#6c757d' }}>In Progress</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#065f46' }}>{readyOrders.length}</div>
              <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Ready</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#374151' }}>{completedOrders.length}</div>
              <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Completed</div>
            </div>
          </div>

          {/* Queued Orders */}
          <h3>Queued Orders ({queuedOrders.length})</h3>
          <div className="orders-list">
            {queuedOrders.length === 0 && <div className="small-muted">No queued orders</div>}
            {queuedOrders.map(order => (
              <div key={order.orderId} className="order-item space-between">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    #{order.orderId} - {order.serviceType}
                  </div>
                  
                  {/* Client's Print Configuration (READ-ONLY) */}
                  <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    padding: '12px', 
                    borderRadius: '6px',
                    marginBottom: '12px',
                    border: '1px solid #e0f2fe'
                  }}>
                    <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '8px' }}>
                      📋 Client's Print Configuration:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.9em' }}>
                      <div><strong>Copies:</strong> {order.quantity}</div>
                      <div><strong>Pages per copy:</strong> {order.pageCount || order.totalPages}</div>
                      <div><strong>Color:</strong> {order.color || "B&W"}</div>
                      <div><strong>Sides:</strong> {order.sides || "Single"}</div>
                      <div><strong>Orientation:</strong> {order.orientation || "Portrait"}</div>
                      <div><strong>Total Pages:</strong> {order.totalPages || (order.quantity * (order.pageCount || 1))}</div>
                    </div>
                    {order.instructions && (
                      <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#8b5cf6' }}>
                        <strong>Instructions:</strong> {order.instructions}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8em', color: '#9ca3af' }}>
                    Client: {order.userId} • Ordered: {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: 8, flexDirection: "column", minWidth: '120px' }}>
                  <button
                    onClick={() => handlePrintClick(order)}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.orderId, "In Progress")}
                    className="btn-ghost"
                  >
                    Start Processing
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* In Progress Orders */}
          <h3 style={{ marginTop: 24 }}>In Progress ({inProgressOrders.length})</h3>
          <div className="orders-list">
            {inProgressOrders.map(order => (
              <div key={order.orderId} className="order-item space-between">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    #{order.orderId} - {order.serviceType}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: 8 }}>
                    {order.quantity} copies • {order.totalPages || order.pageCount} pages • {order.color} • {order.sides}
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#9ca3af' }}>
                    Started: {order.printStartedAt ? new Date(order.printStartedAt).toLocaleString() : 'Recently'}
                  </div>
                </div>
                <button
                  onClick={() => updateOrderStatus(order.orderId, "Ready")}
                  className="btn-primary"
                >
                  Mark as Ready
                </button>
              </div>
            ))}
          </div>

          {/* Ready Orders */}
          <h3 style={{ marginTop: 24 }}>Ready for Pickup ({readyOrders.length})</h3>
          <div className="orders-list">
            {readyOrders.map(order => (
              <div key={order.orderId} className="order-item space-between">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    #{order.orderId} - {order.serviceType}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
                    Ready since: {order.readyAt ? new Date(order.readyAt).toLocaleString() : 'Recently'}
                  </div>
                </div>
                <button
                  onClick={() => updateOrderStatus(order.orderId, "Picked Up")}
                  className="btn-ghost"
                >
                  Mark as Picked Up
                </button>
              </div>
            ))}
          </div>

          {/* Completed Orders */}
          <h3 style={{ marginTop: 24 }}>Completed Orders ({completedOrders.length})</h3>
          <div className="orders-list">
            {completedOrders.map(order => (
              <div key={order.orderId} className="order-item space-between">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    #{order.orderId} - {order.serviceType}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
                    Completed: {order.pickedUpAt ? new Date(order.pickedUpAt).toLocaleString() : 'Recently'}
                  </div>
                </div>
                <div style={{ 
                  padding: "6px 12px", 
                  borderRadius: 6, 
                  background: "#d1fae5",
                  color: "#065f46",
                  fontSize: "0.85em",
                  fontWeight: 600
                }}>
                  Completed ✅
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && selectedOrder && (
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
                  <strong>{selectedOrder.totalPages || (selectedOrder.quantity * (selectedOrder.pageCount || 1))}</strong>
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
                {compatiblePrinters.map(printer => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name} ({printer.location}) - 
                    {printer.supportsColor ? ' Color' : ' B&W'} - 
                    {printer.supportsDuplex ? ' Duplex' : ' Single-side'}
                  </option>
                ))}
              </select>
              {compatiblePrinters.length === 0 && (
                <div style={{ color: '#dc2626', fontSize: '0.9em', marginTop: 8 }}>
                  ⚠️ No compatible printers available for this order's requirements.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  setSelectedOrder(null);
                  setSelectedPrinter("");
                }}
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
                onClick={handlePrint}
                disabled={!selectedPrinter || loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: selectedPrinter && !loading ? '#1e3a8a' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: selectedPrinter && !loading ? 'pointer' : 'not-allowed',
                  fontWeight: 600
                }}
              >
                {loading ? '🔄 Printing...' : '🖨️ Send to Printer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}