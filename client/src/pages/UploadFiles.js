// src/pages/UploadFiles.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import * as mammoth from "mammoth";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ─── Preview Modal ────────────────────────────────────────────────────────────
function FilePreviewModal({ file, onClose }) {
  const [numPages, setNumPages]         = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [scale, setScale]               = useState(1.0);
  const [objectUrl, setObjectUrl]       = useState(null);
  const [docxHtml, setDocxHtml]         = useState("");
  const [docxLoading, setDocxLoading]   = useState(false);

  const fileType = file?.type || "";
  const isPDF    = fileType === "application/pdf";
  const isImage  = fileType.startsWith("image/");
  const isDocx   =
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file?.name?.endsWith(".docx");

  useEffect(() => {
    if (!file || isDocx) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isDocx]);

  useEffect(() => {
    if (!isDocx || !file) return;
    setDocxLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: e.target.result });
        setDocxHtml(result.value);
      } catch {
        setDocxHtml("<p style='color:red'>Failed to render DOCX preview.</p>");
      } finally { setDocxLoading(false); }
    };
    reader.readAsArrayBuffer(file);
  }, [file, isDocx]);

  const fileIcon = isPDF ? "📄" : isImage ? "🖼️" : isDocx ? "📝" : "📁";

  return (
    <div
      className="modal-overlay"
      style={{ alignItems: "flex-start", paddingTop: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: 820, background: "var(--surface)", borderRadius: "var(--radius-xl)", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "var(--text-primary)", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{fileIcon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file?.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                {isPDF ? `PDF • ${numPages ? numPages + " pages" : "loading…"}` : isImage ? "Image" : isDocx ? "Word Document" : "File"}
                {" • "}{(file?.size / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>✕ Close</button>
        </div>

        {/* PDF Controls */}
        {isPDF && numPages && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "var(--surface-2)", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage <= 1} className="btn-secondary" style={{ width: "auto", padding: "5px 12px", fontSize: 13 }}>← Prev</button>
              <span style={{ fontSize: 13, fontWeight: 600, minWidth: 80, textAlign: "center" }}>Page {currentPage} / {numPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, numPages))} disabled={currentPage >= numPages} className="btn-secondary" style={{ width: "auto", padding: "5px 12px", fontSize: 13 }}>Next →</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Zoom:</span>
              {[0.7, 1.0, 1.3, 1.6].map(s => (
                <button key={s} onClick={() => setScale(s)} className={scale === s ? "btn-primary" : "btn-secondary"} style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}>
                  {Math.round(s * 100)}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: isPDF ? 20 : 0, background: isPDF ? "#e8e8ee" : "var(--surface)", display: "flex", justifyContent: "center", minHeight: 400, overflowY: "auto", maxHeight: "70vh" }}>
          {isPDF && objectUrl && (
            <Document file={objectUrl} onLoadSuccess={({ numPages }) => { setNumPages(numPages); setCurrentPage(1); }} loading={<PreviewLoader label="Loading PDF…" />}>
              <Page pageNumber={currentPage} scale={scale} renderAnnotationLayer renderTextLayer loading={<PreviewLoader label="Rendering…" />} />
            </Document>
          )}
          {isImage && objectUrl && <img src={objectUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", display: "block" }} />}
          {isDocx && (
            <div style={{ width: "100%", padding: "24px 32px", overflowY: "auto", maxHeight: "70vh" }}>
              {docxLoading
                ? <PreviewLoader label="Converting Word document…" />
                : <div style={{ fontFamily: "Georgia, serif", fontSize: 15, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: docxHtml }} />}
            </div>
          )}
          {!isPDF && !isImage && !isDocx && (
            <div className="empty-state">
              <div className="empty-state-icon">📁</div>
              <div className="empty-state-title">Preview not available</div>
              <div className="empty-state-desc">File will still be uploaded correctly.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
          <span>🔒 File stays local until you submit</span>
          <button onClick={onClose} className="btn-primary" style={{ width: "auto", padding: "6px 18px", fontSize: 13 }}>Done</button>
        </div>
      </div>
    </div>
  );
}

function PreviewLoader({ label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, gap: 12, color: "var(--text-muted)", width: "100%" }}>
      <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UploadFiles({ user }) {
  const [file, setFile]                     = useState(null);
  const [serviceType, setServiceType]       = useState("");
  const [vendorId, setVendorId]             = useState("");
  const [vendors, setVendors]               = useState([]);
  const [quantity, setQuantity]             = useState(1);
  const [instructions, setInstructions]     = useState("");
  const [color, setColor]                   = useState("B&W");
  const [sides, setSides]                   = useState("Single");
  const [orientation, setOrientation]       = useState("Portrait");
  const [loading, setLoading]               = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [pageCount, setPageCount]           = useState(0);
  const [totalPages, setTotalPages]         = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderData, setOrderData]           = useState(null);
  const [showVendors, setShowVendors]       = useState(false);
  const [showPreview, setShowPreview]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("http://localhost:5000/vendors");
        if (res.data.success) setVendors(res.data.vendors);
      } catch { toast.error("Failed to load vendors"); }
    };
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const total = pageCount * quantity;
    setTotalPages(total);
    setEstimatedPrice(total * 2);
  }, [pageCount, quantity]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    setFile(f); setShowPreview(false);
    if (f) { setPageCount(0); setTotalPages(0); }
  };

  const isPreviewable = (f) => {
    if (!f) return false;
    const t = f.type || "";
    return t === "application/pdf" || t.startsWith("image/") ||
      t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      f.name?.endsWith(".docx");
  };

  const loadRazorpay = () => new Promise(res => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true); s.onerror = () => res(false);
    document.body.appendChild(s);
  });

  const initiatePayment = async (od) => {
    try {
      if (!await loadRazorpay()) throw new Error("Razorpay SDK failed");
      const resp = await axios.post("http://localhost:5000/initiate-order", {
        userId: user.uid, vendorId: od.vendorId, serviceType: od.serviceType,
        fileUrl: od.fileUrl, quantity: od.quantity, color: od.color, sides: od.sides,
        orientation: od.orientation, instructions: od.instructions,
        estimatedPrice: od.estimatedPrice, pageCount: od.pageCount,
        totalPages: od.totalPages, commission: od.commission, vendorEarnings: od.vendorEarnings,
      });
      const { razorpayOrder, tempOrderId, key } = resp.data;
      new window.Razorpay({
        key, amount: razorpayOrder.amount, currency: razorpayOrder.currency,
        name: "QuickPrint", description: `${od.serviceType} — ${od.totalPages} pages`,
        order_id: razorpayOrder.id,
        handler: async (response) => {
          try {
            setLoading(true);
            const v = await axios.post("http://localhost:5000/verify-payment-complete-order", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature, tempOrderId,
            });
            if (v.data.success) {
              const sv = vendors.find(x => x.vendorId === od.vendorId);
              toast.success(`🎉 Order placed! Queue #${v.data.queuePosition} at ${sv?.name}`);
              setFile(null); setServiceType(""); setVendorId(""); setQuantity(1);
              setInstructions(""); setColor("B&W"); setSides("Single");
              setOrientation("Portrait"); setPageCount(0); setTotalPages(0);
              setEstimatedPrice(0); setShowConfirmation(false); setOrderData(null);
              setTimeout(() => navigate("/orders"), 2500);
            }
          } catch (err) {
            toast.error("Verification failed: " + (err?.response?.data?.error || err.message));
          } finally { setLoading(false); }
        },
        prefill: { name: user.displayName || "Customer", email: user.email || "" },
        theme: { color: "#1d4ed8" },
        modal: { ondismiss: () => { toast.info("Payment cancelled"); setLoading(false); } },
      }).open();
    } catch (err) {
      toast.error("Payment failed: " + (err?.response?.data?.error || err.message));
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a file first");
    if (!serviceType) return toast.error("Choose a service type");
    if (!vendorId) return toast.error("Select a print shop");
    setLoading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      toast.info("Uploading and analysing your document…");
      const res = await axios.post("http://localhost:5000/convert", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (!res.data.success) throw new Error(res.data.error || "Conversion failed");
      const { pages, url: fileUrl } = res.data;
      setPageCount(pages);
      toast.success(`Detected ${pages} pages.`);
      const totalP = pages * quantity, price = totalP * 2;
      const comm = price * 0.1, vEarn = price - comm;
      setTotalPages(totalP); setEstimatedPrice(price);
      const sv = vendors.find(v => v.vendorId === vendorId);
      setOrderData({ vendorId, vendorName: sv?.name, vendorAddress: sv?.address, vendorQueue: sv?.currentQueue, estimatedWaitTime: sv?.estimatedWaitTime, userId: user.uid, serviceType, fileUrl, quantity, color, sides, orientation, instructions, estimatedPrice: price, pageCount: pages, totalPages: totalP, commission: comm, vendorEarnings: vEarn });
      setShowConfirmation(true);
    } catch (err) {
      toast.error("Upload failed: " + (err?.response?.data?.error || err.message));
    } finally { setLoading(false); }
  };

  const getSelectedVendor = () => vendors.find(v => v.vendorId === vendorId);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h2>Upload Files</h2>
        <p>Select a print shop, configure your print options, and pay securely</p>
      </div>

      <div className="card">

        {/* Toggle vendors */}
        <button type="button" onClick={() => setShowVendors(v => !v)} className="btn-secondary" style={{ width: "auto", marginBottom: 20 }}>
          🏪 {showVendors ? "Hide" : "Browse"} Print Shops ({vendors.length})
        </button>

        {/* Vendor listing */}
        {showVendors && (
          <div style={{ marginBottom: 24 }}>
            <div className="section-label">Available Print Shops</div>
            {vendors.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">🏪</div><div className="empty-state-title">No shops available right now</div></div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                  {vendors.map(v => (
                    <div key={v.vendorId} className={`vendor-card ${vendorId === v.vendorId ? "selected" : ""}`} onClick={() => setVendorId(v.vendorId)}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <span className="vendor-name">{v.name}</span>
                          <span className={`badge ${v.shopOpen ? "badge-open" : "badge-closed"}`}>{v.shopOpen ? "🟢 Open" : "🔴 Closed"}</span>
                        </div>
                        <div className="vendor-detail">📍 {v.address}</div>
                        <div className="vendor-detail">📞 {v.phone}</div>
                        <div className="vendor-detail" style={{ marginTop: 4 }}>🖨️ {v.services.join(", ")}</div>
                      </div>
                      <div className="vendor-stats">
                        <div className="vendor-queue-count">{v.currentQueue}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>in queue</div>
                        <div className="vendor-wait">⏱ ~{v.estimatedWaitTime} min</div>
                      </div>
                    </div>
                  ))}
                </div>}
            <div className="info-banner info-banner-blue" style={{ marginTop: 12 }}>
              💡 Shop status refreshes every 30s. Closed shops cannot receive orders.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Service + Shop */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Service Type</label>
              <select className="input" value={serviceType} onChange={e => setServiceType(e.target.value)} required>
                <option value="">Select service…</option>
                <option value="Photo Binding">Photo Binding</option>
                <option value="Lamination">Lamination</option>
                <option value="Print">Print</option>
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Print Shop</label>
              <select className="input" value={vendorId} onChange={e => setVendorId(e.target.value)} required>
                <option value="">Choose a shop…</option>
                {vendors.map(v => (
                  <option key={v.vendorId} value={v.vendorId}>
                    {v.name} — {v.currentQueue} in queue {v.shopOpen ? "🟢" : "🔴"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected vendor banner */}
          {vendorId && getSelectedVendor() && (
            <div className="info-banner info-banner-green" style={{ marginBottom: 16 }}>
              <span>🏪</span>
              <div style={{ flex: 1, fontSize: 13 }}>
                <strong>{getSelectedVendor()?.name}</strong>
                {"  ·  "}📍 {getSelectedVendor()?.address}
                {"  ·  "}{getSelectedVendor()?.currentQueue} in queue
                {"  ·  "}~{getSelectedVendor()?.estimatedWaitTime} mins
              </div>
              <span className={`badge ${getSelectedVendor()?.shopOpen ? "badge-open" : "badge-closed"}`}>
                {getSelectedVendor()?.shopOpen ? "🟢 Open" : "🔴 Closed"}
              </span>
            </div>
          )}

          {/* File upload */}
          <div className="form-row">
            <label className="input-label">Upload File</label>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleFile} required style={{ flex: 1, minWidth: 0 }} />
              {file && isPreviewable(file) && (
                <button type="button" onClick={() => setShowPreview(true)} className="btn-secondary" style={{ width: "auto", whiteSpace: "nowrap" }}>
                  👁️ Preview
                </button>
              )}
            </div>
            {file && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 8, padding: "4px 12px", background: "var(--accent-light)", border: "1px solid rgba(29,78,216,0.2)", borderRadius: "var(--radius-full)", fontSize: 12, color: "var(--accent-text)" }}>
                <span>{file.type === "application/pdf" ? "📄" : file.type?.startsWith("image/") ? "🖼️" : "📝"}</span>
                <strong>{file.name}</strong>
                <span style={{ color: "var(--text-muted)" }}>({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Page count */}
          {pageCount > 0 && (
            <div className="info-banner info-banner-green" style={{ marginBottom: 16 }}>
              📄 <strong>{pageCount} pages</strong> detected in your document.
            </div>
          )}

          {/* Copies / Color / Sides / Orientation */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 16 }}>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Number of Copies</label>
              <input type="number" className="input" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Color</label>
              <select className="input" value={color} onChange={e => setColor(e.target.value)}>
                <option value="B&W">Black & White</option>
                <option value="Color">Color</option>
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Sides</label>
              <select className="input" value={sides} onChange={e => setSides(e.target.value)}>
                <option value="Single">Single Sided</option>
                <option value="Double">Double Sided</option>
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Orientation</label>
              <select className="input" value={orientation} onChange={e => setOrientation(e.target.value)}>
                <option value="Portrait">Portrait</option>
                <option value="Landscape">Landscape</option>
              </select>
            </div>
          </div>

          {/* Instructions */}
          <div className="form-row">
            <label className="input-label">
              Special Instructions{" "}
              <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <textarea className="input" value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} placeholder="e.g. glossy finish, specific page ranges, binding preferences…" />
          </div>

          {/* Pricing */}
          {pageCount > 0 && (
            <div className="pricing-box" style={{ marginBottom: 20 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Order Summary</div>
              <div className="pricing-row"><span>Pages per copy</span><span>{pageCount}</span></div>
              <div className="pricing-row"><span>Copies</span><span>× {quantity}</span></div>
              <div className="pricing-row"><span>Total pages</span><span>{totalPages}</span></div>
              <div className="pricing-row"><span>Rate</span><span>₹2 / page</span></div>
              <div className="pricing-row total"><span>Total</span><span>₹{estimatedPrice}</span></div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || (vendorId && !getSelectedVendor()?.shopOpen)}
            style={{ marginTop: 4 }}
          >
            {loading
              ? "Processing…"
              : vendorId && !getSelectedVendor()?.shopOpen
              ? "🔴 Shop is Closed — Cannot Order"
              : `Proceed to Payment — ₹${estimatedPrice}`}
          </button>
        </form>
      </div>

      {/* Preview modal */}
      {showPreview && file && <FilePreviewModal file={file} onClose={() => setShowPreview(false)} />}

      {/* Confirmation modal */}
      {showConfirmation && orderData && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowConfirmation(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>Confirm Your Order</h3>
              <button className="modal-close" onClick={() => { setShowConfirmation(false); setOrderData(null); }}>✕</button>
            </div>

            <div className="info-banner info-banner-green" style={{ marginBottom: 14 }}>
              <span>🏪</span>
              <div>
                <div style={{ fontWeight: 700 }}>{orderData.vendorName}</div>
                <div style={{ fontSize: 13, marginTop: 2 }}>📍 {orderData.vendorAddress}</div>
                <div style={{ fontSize: 13 }}>{orderData.vendorQueue} in queue · ~{orderData.estimatedWaitTime} mins wait</div>
              </div>
            </div>

            <div className="pricing-box" style={{ marginBottom: 14 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Print Details</div>
              {[
                ["Service", orderData.serviceType],
                ["Pages / copy", orderData.pageCount],
                ["Copies", orderData.quantity],
                ["Total pages", orderData.totalPages],
                ["Color", orderData.color],
                ["Sides", orderData.sides],
                ["Orientation", orderData.orientation],
                ...(orderData.instructions ? [["Instructions", orderData.instructions]] : []),
              ].map(([l, v]) => (
                <div key={l} className="pricing-row" style={{ fontSize: 13 }}>
                  <span>{l}</span>
                  <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="pricing-box" style={{ marginBottom: 20 }}>
              <div className="section-label" style={{ marginBottom: 10 }}>Payment</div>
              <div className="pricing-row">
                <span>{orderData.pageCount} pages × {orderData.quantity} copies × ₹2</span>
                <span>₹{orderData.estimatedPrice}</span>
              </div>
              <div className="pricing-row total"><span>Total</span><span>₹{orderData.estimatedPrice}</span></div>
            </div>

            <div className="modal-actions">
              <button onClick={() => { setShowConfirmation(false); setOrderData(null); toast.info("Cancelled."); }} className="btn-ghost" disabled={loading} style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={() => { setLoading(true); setShowConfirmation(false); initiatePayment(orderData); }} className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? "Processing…" : `Pay ₹${orderData.estimatedPrice}`}
              </button>
            </div>

            <div className="info-banner info-banner-blue" style={{ marginTop: 14 }}>
              🔒 Secure payment via Razorpay
            </div>
          </div>
        </div>
      )}
    </div>
  );
}