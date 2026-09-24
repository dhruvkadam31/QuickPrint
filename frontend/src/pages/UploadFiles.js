// src/pages/UploadFiles.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

export default function UploadFiles({ user }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
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
  const [isDragOver, setIsDragOver] = useState(false);

  const navigate = useNavigate();

  // Fetch available vendors with auto-refresh
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await axios.get("http://localhost:5000/vendors");
        if (res.data.success) {
          setVendors(res.data.vendors);
        }
      } catch (err) {
        console.error("Error fetching vendors:", err);
      }
    };

    fetchVendors();
    const interval = setInterval(fetchVendors, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate price dynamically based on total pages & color option
  useEffect(() => {
    const PRICE_PER_PAGE = color === "Color" ? 5 : 2; // ₹2 for B&W, ₹5 for Color
    const calculatedTotalPages = pageCount * quantity;
    setTotalPages(calculatedTotalPages);
    setEstimatedPrice(calculatedTotalPages * PRICE_PER_PAGE);
  }, [pageCount, quantity, color]);

  // Handle file selection (single or multiple)
  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  const addFiles = (newFiles) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    const filtered = newFiles.filter(f => validTypes.includes(f.type) || f.name.match(/\.(pdf|doc|docx|png|jpg|jpeg|webp|txt)$/i));

    if (filtered.length < newFiles.length) {
      toast.warning("Some files were skipped because they are not supported document formats.");
    }

    if (selectedFiles.length + filtered.length > 10) {
      toast.error("Maximum 10 files per order allowed.");
      return;
    }

    setSelectedFiles(prev => [...prev, ...filtered]);
    setPageCount(0); // reset counted pages until analyzed
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPageCount(0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      // If already loaded, skip
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // Simulated payment completion for demo/test keys
  const simulatePaymentSuccess = async (tempOrderId, dataToSubmit) => {
    try {
      setLoading(true);
      toast.info("🔄 Demo mode: Simulating payment verification...");
      const simulatedOrderId = `order_sim_${Date.now()}`;
      const simulatedPaymentId = `pay_sim_${Date.now()}`;
      const simulatedSignature = "demo_signature_bypass";

      const verifyResp = await axios.post("http://localhost:5000/verify-payment-complete-order", {
        razorpay_order_id: simulatedOrderId,
        razorpay_payment_id: simulatedPaymentId,
        razorpay_signature: simulatedSignature,
        tempOrderId,
      });

      if (verifyResp.data.success) {
        const selectedVendor = vendors.find(v => v.vendorId === dataToSubmit.vendorId);
        toast.success(
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>🎉 Order Created Successfully! (Demo)</div>
            <div style={{ marginBottom: '4px' }}>📋 Order ID: {verifyResp.data.orderId}</div>
            <div style={{ marginBottom: '4px' }}>🏪 Vendor: {selectedVendor?.name || "Campus Shop"}</div>
            <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#2563eb' }}>
              📊 Queue Position: #{verifyResp.data.queuePosition}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>Track real-time progress in "My Orders"</div>
          </div>,
          { autoClose: 8000, closeButton: true }
        );
        // Reset form
        setSelectedFiles([]); setServiceType(""); setVendorId(""); setQuantity(1);
        setInstructions(""); setColor("B&W"); setSides("Single"); setOrientation("Portrait");
        setPageCount(0); setTotalPages(0); setEstimatedPrice(0);
        setShowConfirmation(false); setOrderData(null);
        setTimeout(() => navigate('/orders'), 2500);
      }
    } catch (error) {
      toast.error("Demo payment failed: " + (error?.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async (dataToSubmit) => {
    try {
      const initiateResp = await axios.post("http://localhost:5000/initiate-order", {
        userId: user.uid,
        userEmail: user.email,
        vendorId: dataToSubmit.vendorId,
        serviceType: dataToSubmit.serviceType,
        fileUrl: dataToSubmit.fileUrl,
        files: dataToSubmit.files,
        quantity: dataToSubmit.quantity,
        color: dataToSubmit.color,
        sides: dataToSubmit.sides,
        orientation: dataToSubmit.orientation,
        instructions: dataToSubmit.instructions,
        estimatedPrice: dataToSubmit.estimatedPrice,
        pageCount: dataToSubmit.pageCount,
        totalPages: dataToSubmit.totalPages,
        commission: dataToSubmit.commission,
        vendorEarnings: dataToSubmit.vendorEarnings,
      });

      const { razorpayOrder, tempOrderId, key } = initiateResp.data;

      // Detect demo/simulated keys and use simulation mode
      const isSimulatedOrder = razorpayOrder.id?.startsWith("order_sim_");
      const isDemoKey = !key || key.includes("demo") || key.includes("quickprint") || !key.startsWith("rzp_");

      if (isSimulatedOrder || isDemoKey) {
        toast.warning("⚠️ Demo mode active — using simulated payment (add real Razorpay keys in backend .env to enable live payments)");
        await simulatePaymentSuccess(tempOrderId, dataToSubmit);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Razorpay SDK failed to load. Check your internet connection.");

      const handlePaymentSuccess = async (response) => {
        try {
          setLoading(true);
          const verifyResp = await axios.post("http://localhost:5000/verify-payment-complete-order", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            tempOrderId,
          });

          if (verifyResp.data.success) {
            const selectedVendor = vendors.find(v => v.vendorId === dataToSubmit.vendorId);
            toast.success(
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>🎉 Order Created Successfully!</div>
                <div style={{ marginBottom: '4px' }}>📋 Order ID: {verifyResp.data.orderId}</div>
                <div style={{ marginBottom: '4px' }}>🏪 Vendor: {selectedVendor?.name || "Campus Shop"}</div>
                <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#2563eb' }}>
                  📊 Queue Position: #{verifyResp.data.queuePosition}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Track real-time progress in "My Orders"</div>
              </div>,
              { autoClose: 8000, closeButton: true }
            );
            // Reset form
            setSelectedFiles([]); setServiceType(""); setVendorId(""); setQuantity(1);
            setInstructions(""); setColor("B&W"); setSides("Single"); setOrientation("Portrait");
            setPageCount(0); setTotalPages(0); setEstimatedPrice(0);
            setShowConfirmation(false); setOrderData(null);
            setTimeout(() => navigate('/orders'), 2500);
          }
        } catch (error) {
          console.error(error);
          toast.error("Payment verification failed: " + (error?.response?.data?.error || error.message));
        } finally {
          setLoading(false);
        }
      };

      const options = {
        key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "QuickPrint Platform",
        description: `Order for ${dataToSubmit.serviceType} - ${dataToSubmit.totalPages} pages`,
        order_id: razorpayOrder.id,
        handler: handlePaymentSuccess,
        prefill: { name: user.displayName || "Customer", email: user.email || "" },
        theme: { color: "#4F46E5" },
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
    if (selectedFiles.length === 0) return toast.error("Please upload at least one document");
    if (!serviceType) return toast.error("Select a service type");
    if (!vendorId) return toast.error("Select a print shop vendor");

    setLoading(true);

    try {
      const fd = new FormData();
      selectedFiles.forEach((file) => {
        fd.append("file", file);
        fd.append("files", file);
      });
      
      toast.info(`Analyzing ${selectedFiles.length} document(s)...`);

      const convertResp = await axios.post("http://localhost:5000/convert", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      if (!convertResp.data.success) {
        throw new Error(convertResp.data.error || "Document processing failed");
      }

      const { pages, url: fileUrl, files: processedFilesList } = convertResp.data;

      setPageCount(pages);
      toast.success(`Processed ${processedFilesList ? processedFilesList.length : selectedFiles.length} file(s)! Total pages: ${pages}`);

      const calculatedTotalPages = pages * quantity;
      const PRICE_PER_PAGE = color === "Color" ? 5 : 2;
      const finalPrice = calculatedTotalPages * PRICE_PER_PAGE;
      const commission = finalPrice * 0.10;
      const vendorEarnings = finalPrice - commission;

      setTotalPages(calculatedTotalPages);
      setEstimatedPrice(finalPrice);

      const selectedVendor = vendors.find(v => v.vendorId === vendorId);

      const computedOrderData = {
        vendorId,
        vendorName: selectedVendor?.name || "Campus Print Shop",
        vendorAddress: selectedVendor?.address || "Library Ground Floor",
        vendorQueue: selectedVendor?.currentQueue || 0,
        estimatedWaitTime: selectedVendor?.estimatedWaitTime || 5,
        userId: user.uid,
        userEmail: user.email,
        serviceType,
        fileUrl,
        files: processedFilesList || [{ name: selectedFiles[0].name, url: fileUrl, pageCount: pages }],
        quantity,
        color,
        sides,
        orientation,
        instructions,
        estimatedPrice: finalPrice,
        pageCount: pages,
        totalPages: calculatedTotalPages,
        commission,
        vendorEarnings,
      };

      setOrderData(computedOrderData);
      setShowConfirmation(true);
      setLoading(false);

    } catch (err) {
      toast.error("Processing failed: " + (err?.response?.data?.error || err.message));
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
    toast.info("Order modification resumed.");
  };

  return (
    <div className="page-wrapper">
      <div className="card" style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Page Header */}
        <div className="card-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: "var(--brand-gradient)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0, boxShadow: "var(--shadow-brand)"
            }}>🖨️</div>
            <div>
              <div className="card-title">Create Print Order</div>
              <div className="card-subtitle">Upload documents, configure options, and pay securely</div>
            </div>
          </div>
        </div>

        {/* Toggle Print Shops */}
        <div style={{ marginBottom: 20 }}>
          <button
            id="toggle-shops-btn"
            type="button"
            onClick={() => setShowVendors(!showVendors)}
            className="btn-secondary"
          >
            {showVendors ? "▲ Hide Print Shops" : `▼ View Available Print Shops (${vendors.length})`}
          </button>
        </div>

        {/* Vendor Accordion */}
        {showVendors && (
          <div style={{
            marginBottom: 24,
            padding: 16,
            background: "var(--bg-muted)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)"
          }}>
            <div className="section-title">🏪 Available Print Shops</div>

            {vendors.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                Loading print shops...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {vendors.map(vendor => (
                  <div
                    key={vendor.vendorId}
                    className={`vendor-card${vendorId === vendor.vendorId ? " selected" : ""}`}
                    onClick={() => setVendorId(vendor.vendorId)}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                          {vendor.name}
                        </span>
                        <span className={`badge ${vendor.shopOpen ? "badge-open" : "badge-closed"}`}>
                          {vendor.shopOpen ? "● Open" : "● Closed"}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                        📍 {vendor.address} &nbsp;·&nbsp; 📞 {vendor.phone}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Queue</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--brand-primary)" }}>
                        {vendor.currentQueue} orders
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>~{vendor.estimatedWaitTime} min wait</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Drag & Drop Upload Zone */}
          <div
            id="file-drop-zone"
            className={`upload-box${isDragOver ? " drag-over" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input").click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15, marginBottom: 4 }}>
              Drag & Drop your documents here or{" "}
              <span style={{ color: "var(--brand-primary)", textDecoration: "underline" }}>Browse</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              PDF, DOC, DOCX, PNG, JPG, WEBP — Max 10 files, 10MB each
            </div>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div style={{ marginBottom: 20, background: "var(--bg-muted)", padding: 14, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                📄 Selected Files
                <span style={{ background: "var(--brand-gradient)", color: "#fff", borderRadius: "var(--radius-full)", padding: "1px 8px", fontSize: 11 }}>
                  {selectedFiles.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedFiles.map((f, idx) => (
                  <div key={idx} className="file-item">
                    <span style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 13 }}>
                      {idx + 1}. {f.name}{" "}
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        ({(f.size / 1024).toFixed(1)} KB)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      style={{
                        background: "transparent", border: "none",
                        color: "#ef4444", cursor: "pointer",
                        fontWeight: 600, fontSize: 12, fontFamily: "inherit",
                        padding: "4px 8px", borderRadius: "var(--radius-sm)",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.target.style.background = "#fef2f2"}
                      onMouseLeave={e => e.target.style.background = "transparent"}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Print Options */}
          <div style={{ marginBottom: 16 }}>
            <div className="section-title">⚙️ Print Configuration</div>
            <div className="grid-auto">
              <div className="form-row" style={{ margin: 0 }}>
                <label className="input-label">Service Type *</label>
                <select id="service-type-select" className="input" value={serviceType} onChange={e => setServiceType(e.target.value)} required>
                  <option value="">Select service</option>
                  <option value="Print">Document Print</option>
                  <option value="Lamination">Lamination</option>
                  <option value="Photo Binding">Photo Binding</option>
                </select>
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <label className="input-label">Print Shop *</label>
                <select id="vendor-select" className="input" value={vendorId} onChange={e => setVendorId(e.target.value)} required>
                  <option value="">Select vendor</option>
                  {vendors.map(v => (
                    <option key={v.vendorId} value={v.vendorId} disabled={!v.shopOpen}>
                      {v.name} {!v.shopOpen ? "(Closed)" : `(Queue: ${v.currentQueue})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <label className="input-label">Number of Copies</label>
                <input
                  id="quantity-input"
                  type="number"
                  min="1"
                  max="100"
                  className="input"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <label className="input-label">Color</label>
                <select id="color-select" className="input" value={color} onChange={e => setColor(e.target.value)}>
                  <option value="B&W">Black & White (₹2/page)</option>
                  <option value="Color">Color (₹5/page)</option>
                </select>
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <label className="input-label">Sides</label>
                <select id="sides-select" className="input" value={sides} onChange={e => setSides(e.target.value)}>
                  <option value="Single">Single-Sided</option>
                  <option value="Double">Double-Sided (Duplex)</option>
                </select>
              </div>

              <div className="form-row" style={{ margin: 0 }}>
                <label className="input-label">Orientation</label>
                <select id="orientation-select" className="input" value={orientation} onChange={e => setOrientation(e.target.value)}>
                  <option value="Portrait">Portrait</option>
                  <option value="Landscape">Landscape</option>
                </select>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="form-row" style={{ marginBottom: 16 }}>
            <label className="input-label">Special Instructions (Optional)</label>
            <input
              id="instructions-input"
              type="text"
              className="input"
              placeholder="e.g., Staple top left, print pages 1–5 only..."
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
            />
          </div>

          {/* Price Estimation */}
          {pageCount > 0 && (
            <div className="price-highlight" style={{ marginBottom: 16 }}>
              <div>
                <div className="price-label">📄 Page Breakdown</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#14532d", marginTop: 2 }}>
                  {pageCount} pages × {quantity} copies = <strong>{totalPages} total</strong>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="price-label">Estimated Total</div>
                <div className="price-value">₹{estimatedPrice}</div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            id="submit-order-btn"
            type="submit"
            className="btn-primary"
            disabled={loading || selectedFiles.length === 0}
          >
            {loading ? (
              <><span className="spinner" /> Analyzing Documents...</>
            ) : (
              "🚀 Proceed to Review & Payment"
            )}
          </button>
        </form>
      </div>

      {/* Order Confirmation Modal */}
      {showConfirmation && orderData && (
        <div className="modal-overlay">
          <div className="modal-card">
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 28 }}>📋</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text-primary)" }}>
                  Confirm Order
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Review your order before paying
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div style={{
              background: "var(--bg-muted)",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              marginBottom: 16,
              fontSize: 14,
              lineHeight: 1.8,
              border: "1px solid var(--border)"
            }}>
              {[
                ["🏪 Print Shop", orderData.vendorName],
                ["📍 Location", orderData.vendorAddress],
                ["⚙️ Service", orderData.serviceType],
                ["📄 Documents", `${orderData.files.length} file(s)`],
                ["📑 Pages", `${orderData.pageCount} pages × ${orderData.quantity} copies = ${orderData.totalPages} printable`],
                ["🎨 Print Spec", `${orderData.color} · ${orderData.sides} · ${orderData.orientation}`],
                ["📊 Queue Position", `#${orderData.vendorQueue + 1} (~${orderData.estimatedWaitTime} min wait)`],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", minWidth: 130 }}>{label}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{value}</span>
                </div>
              ))}
              {orderData.instructions && (
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", minWidth: 130 }}>💬 Instructions</span>
                  <span style={{ color: "var(--text-secondary)" }}>{orderData.instructions}</span>
                </div>
              )}
              <hr className="divider-dashed" style={{ margin: "12px 0 10px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Total Payable</span>
                <span style={{ fontWeight: 900, fontSize: 22, color: "var(--brand-primary)" }}>
                  ₹{orderData.estimatedPrice}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                id="cancel-order-btn"
                type="button"
                onClick={handleCancelPayment}
                className="btn-ghost"
                style={{ flex: 1, margin: 0 }}
                disabled={loading}
              >
                ← Modify
              </button>
              <button
                id="confirm-payment-btn"
                type="button"
                onClick={handleConfirmPayment}
                className="btn-primary"
                style={{ flex: 1, margin: 0 }}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Processing...</> : "💳 Pay Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
