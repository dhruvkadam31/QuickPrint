// MyOrders.js - Enhanced with invoice system
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function MyOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("active");
  const [queueUpdates, setQueueUpdates] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Fetch all orders
  useEffect(() => {
    if (!user) return;
    fetchAllOrders();
  }, [user]);

  // Real-time queue position updates for active orders
  useEffect(() => {
    if (!user || tab !== "active") return;

    const updateQueuePositions = async () => {
      try {
        const activeOrders = orders.filter(o => o.status !== "Picked Up");
        
        const updatedOrders = await Promise.all(
          activeOrders.map(async (order) => {
            try {
              const response = await axios.get(
                `http://localhost:5000/queue-position/${order.orderId}`
              );
              
              if (response.data.success) {
                return {
                  ...order,
                  queuePosition: response.data.position,
                  totalInQueue: response.data.totalInQueue,
                  estimatedWaitTime: response.data.estimatedWaitTime,
                  vendorName: response.data.vendorName
                };
              }
            } catch (error) {
              console.error(`Error updating queue for order ${order.orderId}:`, error);
            }
            return order;
          })
        );

        // Update only the orders that changed
        setOrders(prev => prev.map(prevOrder => {
          const updatedOrder = updatedOrders.find(o => o.orderId === prevOrder.orderId);
          return updatedOrder || prevOrder;
        }));

        // Update queue updates timestamp
        setQueueUpdates(prev => ({
          ...prev,
          [Date.now()]: `Last updated: ${new Date().toLocaleTimeString()}`
        }));

      } catch (error) {
        console.error("Queue update error:", error);
      }
    };

    // Update immediately, then every 15 seconds
    updateQueuePositions();
    const interval = setInterval(updateQueuePositions, 15000);
    
    return () => clearInterval(interval);
  }, [user, orders, tab]);

  const fetchAllOrders = async () => {
  if (!user) return;

  setLoading(true);
  try {
    console.log("Fetching orders for user:", user.uid);

    const res = await axios.get(
      `http://localhost:5000/order/user/${user.uid}`
    );

    if (res.data.success) {
      setOrders(res.data.orders);
    }

  } catch (err) {
    console.error("Error fetching orders:", err);
    toast.error("Failed to load orders");
  } finally {
    setLoading(false);
  }
};

  const refreshOrders = async () => {
    await fetchAllOrders();
    toast.info("Orders refreshed!");
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "Queued": return "⏳";
      case "In Progress": return "🔄";
      case "Ready": return "✅";
      case "Picked Up": return "📦";
      default: return "📄";
    }
  };

  const viewInvoice = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const downloadInvoice = () => {
    if (!selectedOrder) return;
    
    const invoiceContent = generateInvoiceContent(selectedOrder);
    const blob = new Blob([invoiceContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${selectedOrder.orderId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Invoice downloaded!");
  };

  const generateInvoiceContent = (order) => {
    const commission = order.commission || (order.estimatedPrice * 0.10);
    const vendorEarnings = order.vendorEarnings || (order.estimatedPrice * 0.90);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${order.orderId}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #333; 
        }
        .invoice-container { 
            max-width: 800px; 
            margin: 0 auto; 
            border: 2px solid #1e3a8a; 
            border-radius: 10px; 
            padding: 30px; 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #1e3a8a; 
            padding-bottom: 20px; 
        }
        .company-name { 
            color: #1e3a8a; 
            font-size: 28px; 
            font-weight: bold; 
            margin: 0; 
        }
        .invoice-title { 
            color: #666; 
            font-size: 18px; 
            margin: 5px 0; 
        }
        .order-details { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .detail-section { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 8px; 
        }
        .detail-section h3 { 
            margin: 0 0 10px 0; 
            color: #1e3a8a; 
        }
        .print-config { 
            background: #e3f2fd; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px; 
        }
        .pricing-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
        }
        .pricing-table th, .pricing-table td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
        }
        .pricing-table th { 
            background: #1e3a8a; 
            color: white; 
        }
        .total-row { 
            font-weight: bold; 
            background: #f8f9fa; 
        }
        .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            color: #666; 
        }
        .status-badge { 
            display: inline-block; 
            padding: 5px 10px; 
            border-radius: 15px; 
            font-weight: bold; 
            margin-left: 10px; 
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1 class="company-name">QuickPrint</h1>
            <h2 class="invoice-title">INVOICE</h2>
            <p>Order ID: ${order.orderId}</p>
            <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        <div class="order-details">
            <div class="detail-section">
                <h3>Customer Information</h3>
                <p><strong>User ID:</strong> ${order.userId}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                <p><strong>Status:</strong> 
                    <span class="status-badge" style="background: ${getStatusColor(order.status).bg}; color: ${getStatusColor(order.status).color}">
                        ${order.status}
                    </span>
                </p>
            </div>
            
            <div class="detail-section">
                <h3>Vendor Information</h3>
                <p><strong>Vendor:</strong> ${order.vendorName || 'QuickPrint Partner'}</p>
                <p><strong>Vendor ID:</strong> ${order.vendorId || 'N/A'}</p>
            </div>
        </div>

        <div class="print-config">
            <h3>Print Configuration</h3>
            <p><strong>Service Type:</strong> ${order.serviceType}</p>
            <p><strong>Color:</strong> ${order.color || 'B&W'}</p>
            <p><strong>Sides:</strong> ${order.sides || 'Single'}</p>
            <p><strong>Orientation:</strong> ${order.orientation || 'Portrait'}</p>
            ${order.instructions ? `<p><strong>Special Instructions:</strong> ${order.instructions}</p>` : ''}
        </div>

        <h3>Order Summary</h3>
        <table class="pricing-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Printing (${order.pageCount || order.totalPages} pages × ${order.quantity} copies)</td>
                    <td>${order.totalPages || (order.quantity * (order.pageCount || 1))} pages</td>
                    <td>₹2.00 per page</td>
                    <td>₹${order.estimatedPrice}</td>
                </tr>
                <tr>
                    <td colspan="3" style="text-align: right;">Platform Commission (10%)</td>
                    <td>₹${commission.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="text-align: right;">Vendor Earnings</td>
                    <td>₹${vendorEarnings.toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="3" style="text-align: right;"><strong>Total Amount Paid</strong></td>
                    <td><strong>₹${order.estimatedPrice}</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="footer">
            <p><strong>Thank you for choosing QuickPrint!</strong></p>
            <p>For any queries, contact: support@quickprint.com</p>
            <p>Invoice generated on: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;
  };

  const printInvoice = () => {
    if (!selectedOrder) return;
    
    const invoiceWindow = window.open('', '_blank');
    invoiceWindow.document.write(generateInvoiceContent(selectedOrder));
    invoiceWindow.document.close();
    invoiceWindow.focus();
    
    setTimeout(() => {
      invoiceWindow.print();
    }, 500);
  };

  const filtered = tab === "active"
    ? orders.filter((o) => o.status !== "Picked Up")
    : tab === "completed"
    ? orders.filter((o) => o.status === "Picked Up")
    : orders;

  const activeCount = orders.filter(o => o.status !== "Picked Up").length;
  const readyCount = orders.filter(o => o.status === "Ready").length;
  const completedCount = orders.filter(o => o.status === "Picked Up").length;

  return (
    <div className="page-wrapper">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>My Orders</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>
              {Object.keys(queueUpdates).length > 0 && 
                Object.values(queueUpdates).slice(-1)[0]
              }
            </div>
            <button 
              onClick={refreshOrders}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8em' }}
              disabled={loading}
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
        
        {/* Status Summary */}
        <div style={{ 
          display: 'flex', 
          gap: 12, 
          marginBottom: 16,
          padding: 12,
          backgroundColor: '#f8f9fa',
          borderRadius: 8
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#0369a1' }}>{activeCount}</div>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Active</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#065f46' }}>{readyCount}</div>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Ready</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#374151' }}>{completedCount}</div>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>Completed</div>
          </div>
        </div>

        <div className="tabs">
          <button 
            onClick={() => setTab("active")} 
            className={tab === "active" ? "active" : ""}
          >
            Active ({activeCount})
          </button>
          <button 
            onClick={() => setTab("completed")} 
            className={tab === "completed" ? "active" : ""}
          >
            Completed ({completedCount})
          </button>
          <button 
            onClick={() => setTab("all")} 
            className={tab === "all" ? "active" : ""}
          >
            All ({orders.length})
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          {filtered.length === 0 && !loading && (
            <div className="small-muted" style={{ textAlign: 'center', padding: 40 }}>
              {tab === "active" ? "No active orders" : 
               tab === "completed" ? "No completed orders" : 
               "No orders found"}
            </div>
          )}

          {filtered.map((o) => {
            const statusStyle = getStatusColor(o.status);
            const commission = o.commission || (o.estimatedPrice * 0.10);
            const vendorEarnings = o.vendorEarnings || (o.estimatedPrice * 0.90);
            
            return (
              <div key={o.orderId} className="order-item">
                <div className="space-between">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '1.1em' }}>{getStatusIcon(o.status)}</span>
                      <span style={{ fontWeight: 600 }}>
                        {o.serviceType} • {o.quantity} copies • {o.totalPages || o.pageCount} pages
                      </span>
                    </div>
                    
                    {/* VENDOR INFORMATION */}
                    <div style={{ fontSize: '0.9em', color: '#555', marginBottom: 4 }}>
                      🏪 {o.vendorName || 'Print Shop'}
                    </div>
                    
                    {/* ORDER CONFIGURATION */}
                    <div style={{ 
                      fontSize: '0.85em', 
                      color: '#666', 
                      marginBottom: 8,
                      backgroundColor: '#f8f9fa',
                      padding: '8px',
                      borderRadius: '4px'
                    }}>
                      <strong>Configuration:</strong> {o.color || 'B&W'} • {o.sides || 'Single'} • {o.orientation || 'Portrait'}
                      {o.instructions && (
                        <div style={{ marginTop: '4px' }}>
                          <strong>Instructions:</strong> {o.instructions}
                        </div>
                      )}
                    </div>
                    
                    {/* QUEUE POSITION - ONLY FOR QUEUED ORDERS */}
                    {(o.status === "Queued" || o.status === "In Progress") && o.queuePosition && (
                      <div style={{ 
                        marginBottom: 8,
                        padding: '8px 12px',
                        backgroundColor: '#e7f3ff',
                        border: '1px solid #b3d9ff',
                        borderRadius: 6
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong>Queue Position: #{o.queuePosition}</strong>
                            {o.totalInQueue && (
                              <span style={{ fontSize: '0.9em', color: '#666', marginLeft: 8 }}>
                                (of {o.totalInQueue} in queue)
                              </span>
                            )}
                          </div>
                          {o.estimatedWaitTime && (
                            <div style={{ fontSize: '0.9em', color: '#28a745', fontWeight: 600 }}>
                              ⏱️ ~{o.estimatedWaitTime} mins
                            </div>
                          )}
                        </div>
                        
                        {/* PROGRESS BAR */}
                        {o.totalInQueue && o.queuePosition && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ 
                              width: '100%', 
                              height: '6px', 
                              backgroundColor: '#e9ecef',
                              borderRadius: 3,
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${Math.min(100, ((o.queuePosition - 1) / o.totalInQueue) * 100)}%`,
                                height: '100%',
                                backgroundColor: '#007bff',
                                transition: 'width 0.3s ease'
                              }}></div>
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              fontSize: '0.8em', 
                              color: '#666',
                              marginTop: 4
                            }}>
                              <span>Your turn: #{o.queuePosition}</span>
                              <span>Total: {o.totalInQueue}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* IN PROGRESS STATUS */}
                    {o.status === "In Progress" && (
                      <div style={{ 
                        marginBottom: 8,
                        padding: '8px 12px',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: 6,
                        fontSize: '0.9em'
                      }}>
                        <strong>🔄 Currently being printed</strong>
                        {o.printStartedAt && (
                          <div style={{ fontSize: '0.85em', color: '#856404', marginTop: 4 }}>
                            Started: {new Date(o.printStartedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="small-muted">
                      Order #: {o.orderId} • {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                    
                    {o.status === "Ready" && o.readyAt && (
                      <div style={{ 
                        marginTop: 8, 
                        padding: 8,
                        backgroundColor: '#d1fae5',
                        border: '1px solid #10b981',
                        borderRadius: 6,
                        fontSize: '0.9em',
                        color: '#065f46',
                        fontWeight: 600
                      }}>
                        🎉 Your order is ready for pickup!
                        <div style={{ fontSize: '0.85em', marginTop: 4 }}>
                          Ready at: {new Date(o.readyAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1em' }}>₹{o.estimatedPrice}</div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        fontSize: "0.8em",
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        {o.status}
                      </span>
                    </div>
                    <button
                      onClick={() => viewInvoice(o)}
                      className="btn-secondary"
                      style={{ 
                        marginTop: 8, 
                        padding: '6px 12px',
                        fontSize: '0.8em',
                        width: '100%'
                      }}
                    >
                      📄 View Invoice
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Auto-refresh indicator */}
        {tab === "active" && (
          <div style={{ 
            textAlign: 'center', 
            padding: '12px', 
            fontSize: '0.8em', 
            color: '#6c757d',
            borderTop: '1px solid #dee2e6',
            marginTop: '16px'
          }}>
            🔄 Queue positions update every 15 seconds
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoice && selectedOrder && (
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
            maxWidth: 800,
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 20,
              borderBottom: '2px solid #1e3a8a',
              paddingBottom: 10
            }}>
              <h3 style={{ color: '#1e3a8a', margin: 0 }}>📄 Order Invoice</h3>
              <button
                onClick={() => setShowInvoice(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>

            {/* Invoice Content */}
            <div dangerouslySetInnerHTML={{ __html: generateInvoiceContent(selectedOrder) }} />

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: 12, 
              justifyContent: 'center',
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px solid #ddd'
            }}>
              <button
                onClick={printInvoice}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                🖨️ Print Invoice
              </button>
              <button
                onClick={downloadInvoice}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                📥 Download Invoice
              </button>
              <button
                onClick={() => setShowInvoice(false)}
                className="btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}