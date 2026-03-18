// src/pages/vendor/VendorDashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "../../styles/vendor-dashboard.css";

// Components
import VendorHeader from "../../components/vendor/VendorHeader";
import RevenueCard from "../../components/vendor/RevenueCard";
import WeeklyChart from "../../components/vendor/WeeklyChart";
import OrderCard from "../../components/vendor/OrderCard";
import PrintModal from "../../components/vendor/PrintModal";
import LoadingSpinner from "../../components/common/LoadingSpinner";

// Hooks
import useVendorData from "../../hooks/useVendorData";
import useRevenue from "../../hooks/useRevenue";

export default function VendorDashboard() {
  const navigate = useNavigate();
  const { vendor, loading: vendorLoading } = useVendorData();
  const { revenueData, loading: revenueLoading, refreshRevenue } = useRevenue(vendor?.vendorId);
  
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("queued");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [shopStatus, setShopStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [availablePrinters] = useState([
    { id: "printer1", name: "HP LaserJet Pro M404dn", location: "Counter 1", supportsColor: false, supportsDuplex: true, status: "online" },
    { id: "printer2", name: "Canon imageCLASS LBP623Cdw", location: "Counter 2", supportsColor: true, supportsDuplex: true, status: "online" },
    { id: "printer3", name: "Epson WorkForce WF-2860", location: "Back Office", supportsColor: true, supportsDuplex: true, status: "offline" },
    { id: "printer4", name: "Brother HL-L8360CDW", location: "Color Station", supportsColor: true, supportsDuplex: true, status: "online" }
  ]);

  useEffect(() => {
    if (!vendor) return;
    fetchOrders();
    setShopStatus(vendor.shopOpen);
    
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [vendor]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/vendors/${vendor.vendorId}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      const response = await axios.patch(`http://localhost:5000/orders/${orderId}`, { status: newStatus });
      
      if (response.data.success) {
        toast.success(`Order ${newStatus === "In Progress" ? "started" : "marked as " + newStatus}`);
        fetchOrders();
        refreshRevenue(); // Refresh revenue data after status change
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order status");
    } finally {
      setLoading(false);
    }
  };

  const toggleShopStatus = async () => {
    try {
      const newStatus = !shopStatus;
      const response = await axios.patch(`http://localhost:5000/vendors/${vendor.vendorId}/shop-status`, {
        shopOpen: newStatus
      });
      
      if (response.data.success) {
        setShopStatus(newStatus);
        toast.success(`Shop is now ${newStatus ? "OPEN" : "CLOSED"}`);
      }
    } catch (error) {
      console.error("Error toggling shop status:", error);
      toast.error("Failed to update shop status");
    }
  };

  const handlePrint = async (order, printerId) => {
    try {
      setLoading(true);
      const printer = availablePrinters.find(p => p.id === printerId);
      
      if (order.color === "Color" && !printer.supportsColor) {
        toast.error("Selected printer does not support color printing");
        return;
      }
      
      if (order.sides === "Double" && !printer.supportsDuplex) {
        toast.error("Selected printer does not support double-sided printing");
        return;
      }

      const response = await axios.post("http://localhost:5000/print", {
        orderId: order.orderId,
        printerId: printerId,
        fileUrl: order.fileUrl,
        printConfig: {
          copies: order.quantity || 1,
          color: order.color || "B&W",
          sides: order.sides || "Single",
          orientation: order.orientation || "Portrait"
        }
      });

      if (response.data.success) {
        toast.success(`Print job sent to ${printer.name}`);
        await updateOrderStatus(order.orderId, "In Progress");
        setShowPrintModal(false);
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Failed to send print job");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = () => {
    switch (activeTab) {
      case "queued":
        return orders.filter(o => o.status === "Queued");
      case "progress":
        return orders.filter(o => o.status === "In Progress");
      case "ready":
        return orders.filter(o => o.status === "Ready");
      case "completed":
        return orders.filter(o => o.status === "Picked Up");
      default:
        return orders;
    }
  };

  const getOrderCounts = () => ({
    queued: orders.filter(o => o.status === "Queued").length,
    progress: orders.filter(o => o.status === "In Progress").length,
    ready: orders.filter(o => o.status === "Ready").length,
    completed: orders.filter(o => o.status === "Picked Up").length
  });

  if (vendorLoading) {
    return (
      <div className="vendor-dashboard">
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const orderCounts = getOrderCounts();
  const filteredOrders = getFilteredOrders();

  return (
    <div className="vendor-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <VendorHeader 
          vendor={vendor} 
          shopStatus={shopStatus}
          onToggleStatus={toggleShopStatus}
        />

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card queued">
            <div className="stat-icon">⏳</div>
            <div className="stat-value">{orderCounts.queued}</div>
            <div className="stat-label">Queued Orders</div>
          </div>
          <div className="stat-card progress">
            <div className="stat-icon">🔄</div>
            <div className="stat-value">{orderCounts.progress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card ready">
            <div className="stat-icon">✅</div>
            <div className="stat-value">{orderCounts.ready}</div>
            <div className="stat-label">Ready</div>
          </div>
          <div className="stat-card completed">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{orderCounts.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        {/* Revenue Section */}
        {!revenueLoading && revenueData && (
          <div className="revenue-section">
            <RevenueCard data={revenueData.today} />
            <WeeklyChart data={revenueData.weekly} />
          </div>
        )}

        {/* Orders Section */}
        <div className="orders-section">
          <div className="section-tabs">
            <button 
              className={`tab-btn ${activeTab === "queued" ? "active" : ""}`}
              onClick={() => setActiveTab("queued")}
            >
              Queued <span className="tab-count">{orderCounts.queued}</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === "progress" ? "active" : ""}`}
              onClick={() => setActiveTab("progress")}
            >
              In Progress <span className="tab-count">{orderCounts.progress}</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === "ready" ? "active" : ""}`}
              onClick={() => setActiveTab("ready")}
            >
              Ready <span className="tab-count">{orderCounts.ready}</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              Completed <span className="tab-count">{orderCounts.completed}</span>
            </button>
          </div>

          <div className="orders-list">
            {filteredOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                No orders in this category
              </div>
            ) : (
              filteredOrders.map(order => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  onStatusChange={updateOrderStatus}
                  onPrintClick={() => {
                    setSelectedOrder(order);
                    setShowPrintModal(true);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && selectedOrder && (
        <PrintModal
          order={selectedOrder}
          printers={availablePrinters}
          onClose={() => {
            setShowPrintModal(false);
            setSelectedOrder(null);
          }}
          onPrint={handlePrint}
          loading={loading}
        />
      )}
    </div>
  );
}