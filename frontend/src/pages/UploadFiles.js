import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_URL = "http://localhost:5000/api";

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
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);

  const PRICE_PER_PAGE = 2;

  // Calculate price dynamically
  useEffect(() => {
    const calculatedTotalPages = pageCount * quantity;
    setTotalPages(calculatedTotalPages);
    setEstimatedPrice(calculatedTotalPages * PRICE_PER_PAGE);
  }, [pageCount, quantity]);

  const handleFile = (e) => {
    const selectedFile = e.target.files[0];
    handleFileSelect(selectedFile);
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setPageCount(0);
    setTotalPages(0);
    
    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
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
      setLoading(true);
      
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Razorpay SDK failed to load");

      const initiateResp = await axios.post(`${API_URL}/payments/initiate-order`, {
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
            const verifyResp = await axios.post(`${API_URL}/payments/verify-payment-complete-order`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tempOrderId,
            });

            if (verifyResp.data.success) {
              toast.success(`✅ Order created! ID: ${verifyResp.data.orderId}`);
              resetForm();
            }
          } catch (error) {
            console.error(error);
            toast.error("Payment verification failed: " + (error?.response?.data?.error || error.message));
          } finally {
            setLoading(false);
          }
        },
        prefill: { 
          name: user.displayName || "Customer", 
          email: user.email || "" 
        },
        theme: { color: "#0f172a" },
        modal: { 
          ondismiss: () => {
            toast.info("Payment cancelled");
            setLoading(false);
          } 
        }
      };

      const razorpayWindow = new window.Razorpay(options);
      razorpayWindow.open();
    } catch (error) {
      console.error(error);
      toast.error("Payment initiation failed: " + (error?.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const resetForm = () => {
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
    setPreview(null);
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
      
      toast.info("📄 Uploading and analyzing your document...");

      const convertResp = await axios.post(`${API_URL}/convert`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      if (!convertResp.data.success) {
        throw new Error(convertResp.data.error || "Conversion failed");
      }

      const { pages, url: fileUrl } = convertResp.data;

      setPageCount(pages);
      toast.success(`✅ File processed! Detected ${pages} page${pages > 1 ? 's' : ''}.`);

      const calculatedTotalPages = pages * quantity;
      const finalPrice = calculatedTotalPages * PRICE_PER_PAGE;

      setTotalPages(calculatedTotalPages);
      setEstimatedPrice(finalPrice);

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

    } catch (err) {
      toast.error("❌ Upload failed: " + (err?.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = () => {
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
        <h3>📤 Upload Files</h3>
        <p className="small-muted">Upload your document and customize print settings</p>
        
        <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
          <div className="form-row">
            <label className="input-label">Service Type</label>
            <select 
              className="input" 
              value={serviceType} 
              onChange={e => setServiceType(e.target.value)} 
              required
            >
              <option value="">Select service type</option>
              <option value="Photo Binding">📸 Photo Binding</option>
              <option value="Lamination">🛡️ Lamination</option>
              <option value="Print">🖨️ Print</option>
              <option value="Scan">📱 Scan</option>
              <option value="Copy">📋 Copy</option>
            </select>
          </div>

          <div className="form-row">
            <label className="input-label">Select Vendor</label>
            <select 
              className="input" 
              value={vendorId} 
              onChange={e => setVendorId(e.target.value)} 
              required
            >
              <option value="">Select Vendor</option>
              <option value="vendor1">Vendor 1 (Downtown)</option>
              <option value="vendor2">Vendor 2 (Uptown)</option>
              <option value="vendor3">Vendor 3 (Express)</option>
            </select>
          </div>

          {/* Drag & Drop File Upload */}
          <div className="form-row">
            <label className="input-label">Upload File</label>
            <div
              className={`dropzone ${dragActive ? "active" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input").click()}
            >
              <input
                id="file-input"
                type="file"
                onChange={handleFile}
                style={{ display: "none" }}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt"
              />
              
              {preview ? (
                <div>
                  <img 
                    src={preview} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: 200, 
                      objectFit: "contain",
                      borderRadius: 8
                    }} 
                  />
                  <p style={{ marginTop: 8 }}>{file?.name}</p>
                </div>
              ) : file ? (
                <div>
                  <div style={{ fontSize: 40 }}>📄</div>
                  <p><strong>{file.name}</strong></p>
                  <p className="small-muted">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📁</div>
                  <p><strong>Drag & drop your file here</strong></p>
                  <p className="small-muted">or click to browse</p>
                  <p className="small-muted" style={{ fontSize: 12 }}>
                    Supports: PDF, Images, Documents (Max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Page count info */}
          {pageCount > 0 && (
            <div className="info-box success">
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📄</span>
                <span>Document Analysis Complete</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div>Pages detected: <strong>{pageCount}</strong></div>
              </div>
            </div>
          )}

          <div className="form-row">
            <label className="input-label">Number of Copies</label>
            <input 
              type="number" 
              className="input" 
              min="1" 
              value={quantity} 
              onChange={e => setQuantity(Number(e.target.value))} 
            />
          </div>

          {/* Pricing breakdown */}
          {pageCount > 0 && (
            <div className="info-box warning">
              <div style={{ fontWeight: 700, marginBottom: 12 }}>
                📊 Print Summary
              </div>
              
              <div className="price-breakdown">
                <div className="space-between">
                  <span>Pages per copy:</span>
                  <strong>{pageCount} pages</strong>
                </div>
                <div className="space-between">
                  <span>Number of copies:</span>
                  <strong>{quantity}</strong>
                </div>
                <hr />
                <div className="space-between" style={{ fontWeight: 700 }}>
                  <span>Total pages:</span>
                  <strong>{totalPages} pages</strong>
                </div>
                <div className="space-between" style={{ fontWeight: 700, fontSize: '1.2em' }}>
                  <span>Total amount:</span>
                  <span>₹{estimatedPrice}</span>
                </div>
                <div className="small-muted">
                  (₹{PRICE_PER_PAGE} per page × {totalPages} pages)
                </div>
              </div>
            </div>
          )}

          <div className="form-row">
            <label className="input-label">Color</label>
            <select className="input" value={color} onChange={e => setColor(e.target.value)}>
              <option value="B&W">⚫ Black & White</option>
              <option value="Color">🌈 Color</option>
            </select>
          </div>

          <div className="form-row">
            <label className="input-label">Sides</label>
            <select className="input" value={sides} onChange={e => setSides(e.target.value)}>
              <option value="Single">1️⃣ Single-sided</option>
              <option value="Double">2️⃣ Double-sided</option>
            </select>
          </div>

          <div className="form-row">
            <label className="input-label">Orientation</label>
            <select className="input" value={orientation} onChange={e => setOrientation(e.target.value)}>
              <option value="Portrait">📱 Portrait</option>
              <option value="Landscape">🖥️ Landscape</option>
            </select>
          </div>

          <div className="form-row">
            <label className="input-label">Instructions (Optional)</label>
            <textarea 
              className="input" 
              value={instructions} 
              onChange={e => setInstructions(e.target.value)} 
              rows={3} 
              placeholder="e.g., glossy finish, spiral binding, specific page ranges..."
            />
          </div>

          <div className="total-amount">
            Amount to Pay: ₹{estimatedPrice}
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || pageCount === 0}
          >
            {loading ? "Processing..." : `Proceed to Payment - ₹${estimatedPrice}`}
          </button>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && orderData && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: 20, textAlign: 'center' }}>
              📋 Confirm Your Order
            </h3>
            
            <div className="modal-content">
              <div className="summary-box">
                <h4>Order Summary</h4>
                <div className="summary-grid">
                  <div className="space-between">
                    <span>Service:</span>
                    <strong>{orderData.serviceType}</strong>
                  </div>
                  <div className="space-between">
                    <span>Pages:</span>
                    <strong>{orderData.pageCount}</strong>
                  </div>
                  <div className="space-between">
                    <span>Copies:</span>
                    <strong>{orderData.quantity}</strong>
                  </div>
                  <div className="space-between">
                    <span>Total pages:</span>
                    <strong>{orderData.totalPages}</strong>
                  </div>
                  <div className="space-between">
                    <span>Color:</span>
                    <strong>{orderData.color}</strong>
                  </div>
                  <div className="space-between">
                    <span>Sides:</span>
                    <strong>{orderData.sides}</strong>
                  </div>
                </div>
              </div>
              
              <div className="payment-box">
                <h4>Payment Summary</h4>
                <div className="space-between" style={{ fontSize: '1.2em', fontWeight: 700 }}>
                  <span>Total:</span>
                  <span>₹{orderData.estimatedPrice}</span>
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                onClick={handleCancelPayment}
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
              
              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Processing...' : `Pay ₹${orderData.estimatedPrice}`}
              </button>
            </div>
            
            <div className="secure-badge">
              🔒 Secure & Encrypted Payment
            </div>
          </div>
        </div>
      )}
    </div>
  );
}