// src/pages/UploadFiles.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function UploadFiles({ user }) {
  const [file, setFile] = useState(null);
  const [serviceType, setServiceType] = useState("");
  const [vendorId, setVendorId] = useState("");
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
              toast.success("Order created! ID: " + verifyResp.data.orderId);
              // Reset all form fields
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

      setTotalPages(calculatedTotalPages);
      setEstimatedPrice(finalPrice);

      // Store order data for confirmation
      const orderData = {
        vendorId,
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

  return (
    <div className="page-wrapper">
      <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
        <h3>Upload Files</h3>
        <form onSubmit={handleSubmit} style={{ marginTop: 14 }}>
          <label className="input-label">Service Type</label>
          <select className="input" value={serviceType} onChange={e=>setServiceType(e.target.value)} required>
            <option value="">Select service type</option>
            <option value="Photo Binding">Photo Binding</option>
            <option value="Lamination">Lamination</option>
            <option value="Print">Print</option>
          </select>

          <label className="input-label" style={{ marginTop: 12 }}>Select Vendor</label>
          <select className="input" value={vendorId} onChange={e=>setVendorId(e.target.value)} required>
            <option value="">Select Vendor</option>
            <option value="vendor1_id">Vendor 1</option>
            <option value="vendor2_id">Vendor 2</option>
          </select>

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

          {/* Always show the amount to pay */}
          <div style={{ 
            marginTop: 16, 
            padding: 12, 
            backgroundColor: '#e3f2fd', 
            borderRadius: 6,
            border: '1px solid #2196f3',
            fontWeight: 700,
            fontSize: '1.1em',
            textAlign: 'center'
          }}>
            Amount to Pay: ₹{estimatedPrice}
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            
            style={{ marginTop: 16, width: '100%' }}
          >
            {loading ? "Processing..." : `Proceed to Payment - ₹${estimatedPrice}`}
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