// MyOrders.js - Enhanced with invoice system, cancellation, & refund tracking
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

  // Order Cancellation state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

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
        const activeOrders = orders.filter(o => o.status !== "Picked Up" && o.status !== "Cancelled");
        
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

        setOrders(prev => prev.map(prevOrder => {
          const updatedOrder = updatedOrders.find(o => o.orderId === prevOrder.orderId);
          return updatedOrder || prevOrder;
        }));

        setQueueUpdates(prev => ({
          ...prev,
          [Date.now()]: `Last updated: ${new Date().toLocaleTimeString()}`
        }));

      } catch (error) {
        console.error("Queue update error:", error);
      }
    };

    updateQueuePositions();
    const interval = setInterval(updateQueuePositions, 15000);
    return () => clearInterval(interval);
  }, [user, orders, tab]);

  const fetchAllOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/orders/${user.uid}`);
      setOrders(res.data);
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

  const handleCancelClick = (order) => {
    setCancellingOrder(order);
    setCancelReason("");
    setCancelModalOpen(true);
  };

  const executeCancellation = async () => {
    if (!cancellingOrder) return;
    setIsCancelling(true);

    try {
      const res = await axios.post(`http://localhost:5000/orders/${cancellingOrder.orderId}/cancel`, {
        reason: cancelReason || "Cancelled by customer",
        cancelledBy: "CUSTOMER"
      });

      if (res.data.success) {
        toast.success(`Order #${cancellingOrder.orderId} cancelled successfully!`);
        if (res.data.refundInfo?.refundId) {
          toast.info(`Refund of ₹${res.data.refundInfo.refundAmount} initiated (ID: ${res.data.refundInfo.refundId})`);
        }
        setCancelModalOpen(false);
        setCancellingOrder(null);
        setCancelReason("");
        fetchAllOrders();
      } else {
        toast.error("Cancellation failed: " + res.data.error);
      }
    } catch (err) {
      toast.error("Cancellation error: " + (err.response?.data?.error || err.message));
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Queued": return { bg: "#e0f2fe", color: "#0369a1" };
      case "In Progress": return { bg: "#fef3c7", color: "#92400e" };
      case "Ready": return { bg: "#d1fae5", color: "#065f46" };
      case "Picked Up": return { bg: "#f3f4f6", color: "#374151" };
      case "Cancelled": return { bg: "#fee2e2", color: "#991b1b" };
      default: return { bg: "#f3f4f6", color: "#374151" };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Queued": return "⏳";
      case "In Progress": return "🔄";
      case "Ready": return "✅";
      case "Picked Up": return "📦";
      case "Cancelled": return "❌";
      default: return "📄";
    }
  };

  const viewInvoice = (order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
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
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: #fff; padding: 30px; border: 1px solid #ddd; }
        .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 20px; margin-bottom: 20px; }
        .company-name { color: #1e3a8a; margin: 0; font-size: 28px; }
        .pricing-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .pricing-table th, .pricing-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .pricing-table th { background: #1e3a8a; color: white; }
        .total-row { font-weight: bold; background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <h1 class="company-name">QuickPrint</h1>
            <h2>INVOICE</h2>
            <p>Order ID: ${order.orderId}</p>
            <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
            <h3>Customer: ${order.userId}</h3>
            <h3>Print Shop: ${order.vendorName || 'QuickPrint Partner'}</h3>
            <p>Status: ${order.status}</p>
        </div>
        <table class="pricing-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Pages</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${order.serviceType} (${order.color || 'B&W'}, ${order.sides || 'Single'})</td>
                    <td>${order.totalPages || (order.quantity * (order.pageCount || 1))}</td>
                    <td>₹${order.estimatedPrice}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="2" style="text-align: right;">Total Amount</td>
                    <td>₹${order.estimatedPrice}</td>
                </tr>
            </tbody>
        </table>
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
    setTimeout(() => { invoiceWindow.print(); }, 500);
  };

  const filtered = tab === "active"
    ? orders.filter((o) => o.status !== "Picked Up" && o.status !== "Cancelled")
    : tab === "completed"
    ? orders.filter((o) => o.status === "Picked Up")
    : orders;

  const activeCount = orders.filter(o => o.status !== "Picked Up" && o.status !== "Cancelled").length;
  const readyCount = orders.filter(o => o.status === "Ready").length;
  const completedCount = orders.filter(o => o.status === "Picked Up").length;

  return (
    <div className="page-wrapper">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>My Orders</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.8em', color: '#6c757d' }}>
              {Object.keys(queueUpdates).length > 0 && Object.values(queueUpdates).slice(-1)[0]}
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
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
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
          <button onClick={() => setTab("active")} className={tab === "active" ? "active" : ""}>
            Active ({activeCount})
          </button>
          <button onClick={() => setTab("completed")} className={tab === "completed" ? "active" : ""}>
            Completed ({completedCount})
          </button>
          <button onClick={() => setTab("all")} className={tab === "all" ? "active" : ""}>
            All ({orders.length})
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          {filtered.length === 0 && !loading && (
            <div className="small-muted" style={{ textAlign: 'center', padding: 40 }}>
              {tab === "active" ? "No active orders" : tab === "completed" ? "No completed orders" : "No orders found"}
            </div>
          )}

          {filtered.map((o) => {
            const statusStyle = getStatusColor(o.status);
            const canCancel = o.status === "Queued" || o.status === "In Progress";
            const isCancelled = o.status === "Cancelled";
            const isRefunded = o.paymentStatus === "refunded" || o.refundStatus === "refunded";
            
            return (
              <div key={o.orderId} className="order-item" style={{ marginBottom: 16 }}>
                <div className="space-between">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '1.1em' }}>{getStatusIcon(o.status)}</span>
                      <span style={{ fontWeight: 600 }}>
                        {o.serviceType} • {o.quantity} copies • {o.totalPages || o.pageCount} pages
                      </span>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: '0.75em',
                        fontWeight: 700,
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color
                      }}>
                        {o.status}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.9em', color: '#555', marginBottom: 4 }}>
                      🏪 {o.vendorName || 'Campus Print Shop'}
                    </div>

                    <div style={{ 
                      fontSize: '0.85em', color: '#666', marginBottom: 8,
                      backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '4px'
                    }}>
                      <strong>Specs:</strong> {o.color || 'B&W'} • {o.sides || 'Single'} • {o.orientation || 'Portrait'}
                    </div>

                    {/* Active Queue Details */}
                    {(o.status === "Queued" || o.status === "In Progress") && (
                      <div style={{ fontSize: '0.85em', color: '#0369a1', marginBottom: 8, backgroundColor: '#e0f2fe', padding: '6px 10px', borderRadius: '4px' }}>
                        📊 Queue Position: #{o.queuePosition || 1} • Est. Wait Time: ~{o.estimatedWaitTime || 5} mins
                      </div>
                    )}

                    {/* Cancellation & Refund Notice Banner */}
                    {isCancelled && (
                      <div style={{ fontSize: '0.85em', color: '#991b1b', backgroundColor: '#fee2e2', padding: '8px 12px', borderRadius: '6px', marginTop: 8 }}>
                        <div><strong>Reason:</strong> {o.cancellationReason || "Cancelled by customer"}</div>
                        {isRefunded ? (
                          <div style={{ color: '#166534', marginTop: 4, fontWeight: 600 }}>
                            ✅ Refund Processed: ₹{o.refundAmount || o.estimatedPrice} (ID: {o.refundId || 'N/A'})
                          </div>
                        ) : (
                          <div style={{ color: '#64748b', marginTop: 4 }}>No refund incurred.</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', marginLeft: 16 }}>
                    <div style={{ fontSize: '1.2em', fontWeight: 800, color: '#0f172a' }}>
                      ₹{o.estimatedPrice}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                      <button 
                        onClick={() => viewInvoice(o)} 
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8em' }}
                      >
                        📄 Invoice
                      </button>

                      {canCancel && (
                        <button 
                          onClick={() => handleCancelClick(o)} 
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8em',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          ❌ Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancellation Confirmation Dialog */}
        {cancelModalOpen && cancellingOrder && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}>
            <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 14, maxWidth: 450, width: '90%' }}>
              <h3 style={{ marginTop: 0, color: '#991b1b' }}>⚠️ Cancel Order Confirmation</h3>
              <p style={{ fontSize: '14px', color: '#475569' }}>
                Are you sure you want to cancel order <strong>#{cancellingOrder.orderId}</strong>?
                {cancellingOrder.paymentStatus === 'completed' && " If paid, a refund will be automatically credited to your payment method."}
              </p>

              <div style={{ marginBottom: 16 }}>
                <label className="input-label">Cancellation Reason (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Change of mind, ordered wrong document..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setCancelModalOpen(false)}
                  className="btn-ghost"
                  style={{ flex: 1 }}
                  disabled={isCancelling}
                >
                  Keep Order
                </button>
                <button
                  onClick={executeCancellation}
                  style={{
                    flex: 1,
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling & Refund..." : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoice && selectedOrder && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}>
            <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 12, maxWidth: 600, width: '90%' }}>
              <h3>Invoice - #{selectedOrder.orderId}</h3>
              <p>Amount: ₹{selectedOrder.estimatedPrice}</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button onClick={printInvoice} className="btn-primary" style={{ flex: 1 }}>🖨️ Print / Download</button>
                <button onClick={() => setShowInvoice(false)} className="btn-ghost" style={{ flex: 1 }}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}