// src/pages/UploadFiles.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function UploadFiles({ user }) {
  const [file, setFile] = useState(null);
  const [serviceType, setServiceType] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [color, setColor] = useState("B&W");
  const [sides, setSides] = useState("Single");
  const [orientation, setOrientation] = useState("Portrait");
  const [loading, setLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [showVendors, setShowVendors] = useState(false);
  
  const navigate = useNavigate();

  // Fetch available vendors with auto-refresh
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await axios.get("http://localhost:5000/vendor");
        if (res.data.success) {
          setVendors(res.data.vendors);
        }
      } catch (err) {
        console.error("Error fetching vendors:", err);
        toast.error("Failed to load vendors");
      }
    };

    fetchVendors();
    // Refresh vendors every 30 seconds to get real-time shop status
    const interval = setInterval(fetchVendors, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate price dynamically based on total pages
  useEffect(() => {
    const PRICE_PER_PAGE = 2; // ₹2 per page
    const calculatedTotalPages = pageCount * quantity;
    setTotalPages(calculatedTotalPages);
    setEstimatedPrice(calculatedTotalPages * PRICE_PER_PAGE);
  }, [pageCount, quantity]);

  const handleFile = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    // Reset page count when new file is selected
    if (selectedFile) {
      setPageCount(0);
      setTotalPages(0);
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const initiatePayment = async (orderData) => {
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Razorpay SDK failed to load");

      const initiateResp = await axios.post("http://localhost:5000/initiate-order", {
        userId: user.uid,
        vendorId: orderData.vendorId,
        serviceType: orderData.serviceType,
        fileUrl: orderData.fileUrl,
        quantity: orderData.quantity,
        color: orderData.color,
        sides: orderData.sides,
        orientation: orderData.orientation,
        instructions: orderData.instructions,
        estimatedPrice: orderData.estimatedPrice,
        pageCount: orderData.pageCount,
        totalPages: orderData.totalPages,
        commission: orderData.commission,
        vendorEarnings: orderData.vendorEarnings,
      });

      const { razorpayOrder, tempOrderId, key } = initiateResp.data;

      const options = {
        key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "QuickPrint",
        description: `Order for ${orderData.serviceType} - ${orderData.totalPages} pages`,
        order_id: razorpayOrder.id,
        handler: async function (response) {
          try {
            setLoading(true);
            const verifyResp = await axios.post("http://localhost:5000/verify-payment-complete-order", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tempOrderId,
            });

            if (verifyResp.data.success) {
              const selectedVendor = vendors.find(v => v.vendorId === orderData.vendorId);
              
              // Enhanced success message with queue info
              toast.success(
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
                    🎉 Order Created Successfully!
                  </div>
                  <div style={{ marginBottom: '4px' }}>📋 Order ID: {verifyResp.data.orderId}</div>
                  <div style={{ marginBottom: '4px' }}>🏪 Vendor: {selectedVendor?.name}</div>
                  <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#007bff' }}>
                    📊 Queue Position: #{verifyResp.data.queuePosition}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Track real-time progress in "My Orders"
                  </div>
                </div>,
                { 
                  autoClose: 8000,
                  closeButton: true
                }
              );
              
              // Reset form
              setFile(null);
              setServiceType("");
              setVendorId("");
              setQuantity(1);
              setInstructions("");
              setColor("B&W");
              setSides("Single");
              setOrientation("Portrait");
              setPageCount(0);
              setTotalPages(0);
              setEstimatedPrice(0);
              setShowConfirmation(false);
              setOrderData(null);
              
              // Auto-navigate to My Orders after delay
              setTimeout(() => {
                navigate('/orders');
              }, 3000);
            }
          } catch (error) {
            console.error(error);
            toast.error("Payment verification failed: " + (error?.response?.data?.error || error.message));
          } finally {
            setLoading(false);
          }
        },
        prefill: { name: user.displayName || "Customer", email: user.email || "" },
        theme: { color: "#3399cc" },
        modal: { ondismiss: () => { toast.info("Payment cancelled"); setLoading(false); } }
      };

      const razorpayWindow = new window.Razorpay(options);
      razorpayWindow.open();
    } catch (error) {
      console.error(error);
      toast.error("Payment initiation failed: " + (error?.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a file first");
    if (!serviceType) return toast.error("Choose a service type");
    if (!vendorId) return toast.error("Select a vendor");

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      
      toast.info("Uploading and analyzing your document...");

      const convertResp = await axios.post("http://localhost:5000/convert", fd, {
        headers: { 
          "Content-Type": "multipart/form-data",
        }
      });
      
      if (!convertResp.data.success) {
        throw new Error(convertResp.data.error || "Conversion failed");
      }

      const { pages, url: fileUrl } = convertResp.data;

      setPageCount(pages);
      toast.success(`File converted successfully! Detected ${pages} pages.`);

      const calculatedTotalPages = pages * quantity;
      const PRICE_PER_PAGE = 2;
      const finalPrice = calculatedTotalPages * PRICE_PER_PAGE;
      const commission = finalPrice * 0.10; // 10% commission
      const vendorEarnings = finalPrice - commission; // Vendor gets 90%

      setTotalPages(calculatedTotalPages);
      setEstimatedPrice(finalPrice);

      // Get selected vendor details
      const selectedVendor = vendors.find(v => v.vendorId === vendorId);

      // Store order data for confirmation
      const orderData = {
        vendorId,
        vendorName: selectedVendor?.name,
        vendorAddress: selectedVendor?.address,
        vendorQueue: selectedVendor?.currentQueue,
        estimatedWaitTime: selectedVendor?.estimatedWaitTime,
        userId: user.uid,
        serviceType,
        fileUrl,
        quantity,
        color,
        sides,
        orientation,
        instructions,
        estimatedPrice: finalPrice,
        pageCount: pages,
        totalPages: calculatedTotalPages,
        commission: commission,
        vendorEarnings: vendorEarnings,
      };

      setOrderData(orderData);
      setShowConfirmation(true);
      setLoading(false);

    } catch (err) {
      toast.error("Upload failed: " + (err?.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  const handleConfirmPayment = () => {
    setLoading(true);
    setShowConfirmation(false);
    initiatePayment(orderData);
  };

  const handleCancelPayment = () => {
    setShowConfirmation(false);
    setOrderData(null);
    toast.info("Payment cancelled. You can modify your order.");
  };

  const getSelectedVendor = () => {
    return vendors.find(v => v.vendorId === vendorId);
  };

  return (
    <div className="page-wrapper">
      <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h3>Upload Files</h3>
        
        {/* Show Available Vendors Button */}
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <button
            onClick={() => setShowVendors(!showVendors)}
            className="btn-secondary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              margin: '0 auto',
              padding: '10px 20px'
            }}
          >
            {showVendors ? '▲' : '▼'} 
            {showVendors ? 'Hide Available Print Shops' : 'Show Available Print Shops'}
            ({vendors.length})
          </button>
        </div>

        {/* Vendors Listing Section */}
        {showVendors && (
          <div style={{ 
            marginBottom: 24,
            padding: 16,
            backgroundColor: '#f8f9fa',
            borderRadius: 12,
            border: '1px solid #e9ecef'
          }}>
            <h4 style={{ marginBottom: 16, color: '#495057' }}>🏪 Available Print Shops</h4>
            
            {vendors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#6c757d' }}>
                No print shops available at the moment
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {vendors.map(vendor => (
                  <div 
                    key={vendor.vendorId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      backgroundColor: 'white',
                      borderRadius: 8,
                      border: '1px solid #dee2e6',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      ...(vendorId === vendor.vendorId && {
                        borderColor: '#007bff',
                        backgroundColor: '#f8f9ff'
                      })
                    }}
                    onClick={() => setVendorId(vendor.vendorId)}
                  >
                    {/* Vendor Details - Left Side */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <h5 style={{ margin: 0, color: '#343a40' }}>{vendor.name}</h5>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: 12,
                            fontSize: '0.75em',
                            fontWeight: 600,
                            backgroundColor: vendor.shopOpen ? '#d4edda' : '#f8d7da',
                            color: vendor.shopOpen ? '#155724' : '#721c24'
                          }}
                        >
                          {vendor.shopOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gap: 4, fontSize: '0.9em', color: '#6c757d' }}>
                        <div>📍 {vendor.address}</div>
                        <div>📞 {vendor.phone}</div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                          <span>🖨️ Services: {vendor.services.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Queue & Wait Time - Right Side */}
                    <div style={{ textAlign: 'right', minWidth: 120 }}>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: '0.85em', color: '#6c757d' }}>Current Queue</div>
                        <div style={{ fontSize: '1.2em', fontWeight: 700, color: '#007bff' }}>
                          {vendor.currentQueue} orders
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85em', color: '#6c757d' }}>Wait Time</div>
                        <div style={{ fontSize: '1em', fontWeight: 600, color: '#28a745' }}>
                          ~{vendor.estimatedWaitTime} mins
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ 
              marginTop: 12, 
              padding: 12, 
              backgroundColor: '#e7f3ff', 
              borderRadius: 6,
              fontSize: '0.85em',
              color: '#0066cc',
              textAlign: 'center'
            }}>
              💡 Shop status updates in real-time. Closed shops won't receive new orders.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <label className="input-label">Service Type</label>
          <select className="input" value={serviceType} onChange={e=>setServiceType(e.target.value)} required>
            <option value="">Select service type</option>
            <option value="Photo Binding">Photo Binding</option>
            <option value="Lamination">Lamination</option>
            <option value="Print">Print</option>
          </select>

          {/* Vendor Selection with Queue Info */}
          <label className="input-label" style={{ marginTop: 12 }}>Select Print Shop</label>
          <select className="input" value={vendorId} onChange={e=>setVendorId(e.target.value)} required>
            <option value="">Choose a print shop...</option>
            {vendors.map(vendor => (
              <option key={vendor.vendorId} value={vendor.vendorId}>
                {vendor.name} - {vendor.currentQueue} in queue • ~{vendor.estimatedWaitTime} mins • 
                {vendor.shopOpen ? ' 🟢 OPEN' : ' 🔴 CLOSED'}
              </option>
            ))}
          </select>

          {/* Vendor Details Card */}
          {vendorId && (
            <div style={{ 
              marginTop: 12, 
              padding: 12, 
              backgroundColor: '#e8f5e8', 
              borderRadius: 6,
              border: '1px solid #4caf50'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: '#2e7d32' }}>
                  🏪 {getSelectedVendor()?.name}
                </div>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: '0.75em',
                    fontWeight: 600,
                    backgroundColor: getSelectedVendor()?.shopOpen ? '#d4edda' : '#f8d7da',
                    color: getSelectedVendor()?.shopOpen ? '#155724' : '#721c24'
                  }}
                >
                  {getSelectedVendor()?.shopOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                </span>
              </div>
              <div style={{ fontSize: '0.9em', color: '#555' }}>
                <div>📍 {getSelectedVendor()?.address}</div>
                <div>📞 {getSelectedVendor()?.phone}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <span>📊 Current Queue: {getSelectedVendor()?.currentQueue} orders</span>
                  <span>⏱️ Estimated Wait: ~{getSelectedVendor()?.estimatedWaitTime} minutes</span>
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          <label className="input-label" style={{ marginTop: 12 }}>Upload File</label>
          <input type="file" onChange={handleFile} required />

          {/* Display page count information */}
          {pageCount > 0 && (
            <div style={{ 
              marginTop: 12, 
              padding: 12, 
              backgroundColor: '#e8f5e8', 
              borderRadius: 6,
              border: '1px solid #4caf50'
            }}>
              <div style={{ fontWeight: 600, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📄</span>
                <span>Document Analysis Complete</span>
              </div>
              <div style={{ marginTop: 8, fontSize: '0.95em' }}>
                <div>Pages detected in your file: <strong>{pageCount}</strong></div>
                <div style={{ marginTop: 4, fontSize: '0.9em', color: '#555' }}>
                  The system automatically counted {pageCount} pages in your document.
                </div>
              </div>
            </div>
          )}

          {/* Quantity + Price */}
          <label className="input-label" style={{ marginTop: 12 }}>Number of Copies</label>
          <input 
            type="number" 
            className="input" 
            min="1" 
            value={quantity} 
            onChange={e=>setQuantity(Number(e.target.value))} 
          />

          {/* Display pricing breakdown */}
          {pageCount > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              backgroundColor: '#fff3cd', 
              borderRadius: 6,
              border: '1px solid #ffc107'
            }}>
              <div style={{ fontWeight: 700, color: '#856404', marginBottom: 12, fontSize: '1.1em' }}>
                📊 Print Summary
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Pages per copy:</span>
                <strong>{pageCount} pages</strong>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Number of copies:</span>
                <strong>{quantity}</strong>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #ddd' }}>
                <span>Total pages to print:</span>
                <strong>{totalPages} pages</strong>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1em' }}>
                <span>Total amount:</span>
                <span>₹{estimatedPrice}</span>
              </div>
              
              <div style={{ fontSize: '0.85em', color: '#666', marginTop: 6 }}>
                (₹2 per page × {totalPages} total pages)
              </div>
            </div>
          )}

          <label className="input-label" style={{ marginTop: 12 }}>Color</label>
          <select className="input" value={color} onChange={e=>setColor(e.target.value)}>
            <option value="B&W">B&W</option>
            <option value="Color">Color</option>
          </select>

          <label className="input-label" style={{ marginTop: 12 }}>Sides</label>
          <select className="input" value={sides} onChange={e=>setSides(e.target.value)}>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
          </select>

          <label className="input-label" style={{ marginTop: 12 }}>Orientation</label>
          <select className="input" value={orientation} onChange={e=>setOrientation(e.target.value)}>
            <option value="Portrait">Portrait</option>
            <option value="Landscape">Landscape</option>
          </select>

          <label className="input-label" style={{ marginTop: 12 }}>Instructions (Optional)</label>
          <textarea 
            className="input" 
            value={instructions} 
            onChange={e=>setInstructions(e.target.value)} 
            rows={3} 
            placeholder="e.g., glossy finish, specific page ranges, binding preferences" 
          />

          {/* Commission & Pricing Breakdown */}
          {pageCount > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              backgroundColor: '#e3f2fd', 
              borderRadius: 6,
              border: '1px solid #2196f3'
            }}>
              <div style={{ fontWeight: 700, color: '#1976d2', marginBottom: 12, fontSize: '1.1em' }}>
                💰 Pricing Breakdown
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Printing Cost ({totalPages} pages × ₹2):</span>
                <span>₹{estimatedPrice}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Platform Commission (10%):</span>
                <span>₹{(estimatedPrice * 0.10).toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #90caf9' }}>
                <span>Vendor Earnings:</span>
                <span>₹{(estimatedPrice * 0.90).toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1em' }}>
                <span>Amount to Pay:</span>
                <span>₹{estimatedPrice}</span>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || (vendorId && !getSelectedVendor()?.shopOpen)}
            style={{ marginTop: 16, width: '100%' }}
          >
            {loading ? "Processing..." : 
             (vendorId && !getSelectedVendor()?.shopOpen) ? 
             "❌ Shop is Closed - Cannot Place Order" : 
             `Proceed to Payment - ₹${estimatedPrice}`}
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && orderData && (
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
            <h3 style={{ marginBottom: 20, color: '#333', textAlign: 'center' }}>
              📋 Confirm Your Order
            </h3>
            
            <div style={{ marginBottom: 20 }}>
              {/* Vendor Information */}
              <div style={{ 
                backgroundColor: '#d1fae5', 
                padding: 16, 
                borderRadius: 8,
                border: '1px solid #10b981',
                marginBottom: 16
              }}>
                <h4 style={{ marginBottom: 12, color: '#065f46' }}>🏪 Print Shop</h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#065f46' }}>Shop Name:</span>
                    <strong>{orderData.vendorName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#065f46' }}>Address:</span>
                    <strong style={{ textAlign: 'right' }}>{orderData.vendorAddress}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#065f46' }}>Current Queue:</span>
                    <strong>{orderData.vendorQueue} orders</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#065f46' }}>Estimated Wait:</span>
                    <strong>~{orderData.estimatedWaitTime} minutes</strong>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: 16, 
                borderRadius: 8,
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ marginBottom: 12, color: '#495057' }}>Order Summary</h4>
                
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Service Type:</span>
                    <strong>{orderData.serviceType}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>File Pages:</span>
                    <strong>{orderData.pageCount} pages</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Copies:</span>
                    <strong>{orderData.quantity}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Total Pages:</span>
                    <strong>{orderData.totalPages} pages</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Color:</span>
                    <strong>{orderData.color}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Sides:</span>
                    <strong>{orderData.sides}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6c757d' }}>Orientation:</span>
                    <strong>{orderData.orientation}</strong>
                  </div>
                  
                  {orderData.instructions && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ color: '#6c757d' }}>Instructions:</span>
                      <strong style={{ textAlign: 'right', maxWidth: '60%' }}>{orderData.instructions}</strong>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Payment Summary */}
              <div style={{ 
                backgroundColor: '#fff3cd', 
                padding: 16, 
                borderRadius: 8,
                border: '1px solid #ffc107',
                marginTop: 16
              }}>
                <h4 style={{ marginBottom: 12, color: '#856404' }}>Payment Summary</h4>
                
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pages per copy:</span>
                    <span>{orderData.pageCount} × ₹2</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Number of copies:</span>
                    <span>× {orderData.quantity}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#666' }}>
                    <span>Platform Commission (10%):</span>
                    <span>₹{orderData.commission.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#666' }}>
                    <span>Vendor Earnings:</span>
                    <span>₹{orderData.vendorEarnings.toFixed(2)}</span>
                  </div>
                  
                  <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1em', fontWeight: 700 }}>
                    <span>Total Amount:</span>
                    <span>₹{orderData.estimatedPrice}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: 12,
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelPayment}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '1em',
                  flex: 1
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '1em',
                  fontWeight: 600,
                  flex: 1
                }}
              >
                {loading ? 'Processing...' : `Confirm & Pay ₹${orderData.estimatedPrice}`}
              </button>
            </div>
            
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: '#e7f3ff', 
              borderRadius: 6,
              border: '1px solid #b3d9ff',
              fontSize: '0.9em',
              color: '#0066cc',
              textAlign: 'center'
            }}>
              🔒 Your payment is secure and encrypted
            </div>
          </div>
        </div>
      )}
    </div>
  );
}