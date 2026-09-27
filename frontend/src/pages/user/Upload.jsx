import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import {
  uploadFile,
  getAvailableVendors,
  initiatePayment,
  verifyPayment,
  getWaitTimePrediction,
} from "../../services/api";
import UserNavbar from "../../components/user/UserNavbar";
import socket from "../../services/socket";

const STEPS = ["Upload File", "Configure", "Select Vendor", "Payment"];

// Parse custom page string like "1,3,5-8" → count of pages
function parseCustomPages(str) {
  if (!str.trim()) return 0;
  let count = 0;
  const parts = str.split(",");
  for (let p of parts) {
    p = p.trim();
    if (p.includes("-")) {
      const [a, b] = p.split("-").map(Number);
      if (!isNaN(a) && !isNaN(b) && b >= a) count += b - a + 1;
    } else {
      if (!isNaN(Number(p)) && p !== "") count += 1;
    }
  }
  return count;
}

// Session storage hook to prevent state loss on refresh
function useSessionState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn("SessionStorage error", error);
    }
  }, [key, state]);

  return [state, setState];
}

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useSessionState("qp_step", 0);
  const [files, setFiles] = useState([]); // Native File objects can't be stringified
  const [processedFiles, setProcessedFiles] = useSessionState("qp_processedFiles", []);
  const [fileUrl, setFileUrl] = useSessionState("qp_fileUrl", "");
  const [originalFileName, setOriginalFileName] = useSessionState("qp_originalFileName", "");
  const [processedUrl, setProcessedUrl] = useSessionState("qp_processedUrl", "");
  const [thumbnailUrl, setThumbnailUrl] = useSessionState("qp_thumbnailUrl", "");
  const [metadata, setMetadata] = useSessionState("qp_metadata", null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Per-file Config
  const [fileConfigs, setFileConfigs] = useSessionState("qp_fileConfigs", []);
  const [activeFileIdx, setActiveFileIdx] = useSessionState("qp_activeFileIdx", 0);

  const activeConfig = fileConfigs[activeFileIdx] || {};
  const updateConfig = (key, value) => {
    setFileConfigs((prev) => {
      const next = [...prev];
      next[activeFileIdx] = { ...next[activeFileIdx], [key]: value };
      return next;
    });
  };

  // Vendor
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useSessionState("qp_selectedVendor", null);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [waitTimeData, setWaitTimeData] = useState({});
  // Payment
  const [paying, setPaying] = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const fileInputRef = useRef();

  const getPricePerPage = (c) => selectedVendor
    ? c === "Color"
      ? selectedVendor.colorPricePerPage
      : selectedVendor.bwPricePerPage
    : c === "Color"
    ? 5
    : 1.5;

  let effectivePageCount = 0;
  let totalSheets = 0;
  let estimatedPrice = 0;

  fileConfigs.forEach(cfg => {
    const pages = cfg.pageOption === "All" ? cfg.totalDocPages : (parseCustomPages(cfg.customPages) || 0);
    effectivePageCount += (pages * cfg.quantity);
    
    const sheets = Math.ceil(pages / cfg.pagesPerSheet) || 0;
    const itemTotalSheets = sheets * cfg.quantity;
    totalSheets += itemTotalSheets;
    
    estimatedPrice += itemTotalSheets * getPricePerPage(cfg.color);
  });
  estimatedPrice = +estimatedPrice.toFixed(2);

  // Step 3: load vendors
  useEffect(() => {
    if (step === 2) {
      setLoadingVendors(true);

      getAvailableVendors()
        .then(async (res) => {
          setVendors(res.data);

          const waitResults = {};

          for (const vendor of res.data) {
            try {
              const waitRes = await getWaitTimePrediction({
                vendorId: vendor._id,
                jobPages: effectivePageCount,
                color: "B&W",
                sides: "Single",
              });
              waitResults[vendor._id] = waitRes.data.ml_response;
            } catch {
              waitResults[vendor._id] = null;
            }
          }

          setWaitTimeData(waitResults);
        })
        .catch(() => toast.error("Could not load vendors"))
        .finally(() => setLoadingVendors(false));
    }
  }, [step]);

  useEffect(() => {
    socket.on("vendor-status-change", async () => {
      try {
        const res = await getAvailableVendors();
        setVendors(res.data);
      } catch {
        console.log("Failed to refresh vendors");
      }
    });
    return () => socket.off("vendor-status-change");
  }, []);

  // ── File handling ──
  const handleFileChange = (selection) => {
    const selected = Array.from(selection || []);
    if (!selected.length) return;
    
    setFiles((prev) => {
      const newFiles = [...prev, ...selected];
      if (newFiles.length > 10) {
        toast.error("Select no more than 10 files per order");
        return prev;
      }
      setProcessedFiles([]);
      setFileUrl("");
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (!files.length) return toast.error("Please select at least one file");
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((file) => fd.append("files", file));
      const res = await uploadFile(fd);
      const uploadedFiles = res.data.files || [];
      const firstFile = uploadedFiles[0];

      // Set processed file data
      setProcessedFiles(uploadedFiles);
      setFileConfigs(uploadedFiles.map(f => ({
        serviceType: "Print",
        pageOption: "All",
        customPages: "",
        totalDocPages: f.pageCount || 1,
        pagesPerSheet: 1,
        quantity: 1,
        color: "B&W",
        sides: "Single",
        orientation: "Portrait",
        instructions: ""
      })));
      setActiveFileIdx(0);
      setFileUrl(firstFile?.fileUrl || res.data.fileUrl || "");
      setOriginalFileName(firstFile?.originalName || res.data.originalName || files[0].name);
      setProcessedUrl(res.data.processedUrl || "");
      setThumbnailUrl(res.data.thumbnailUrl || "");
      setMetadata(res.data.metadata || null);

      toast.success(`File processed successfully! Detected ${res.data.pageCount || 1} pages.`);
      setStep(1);
    } catch (err) {
      toast.error(
        "Upload failed: " + (err.response?.data?.error || err.message)
      );
    } finally {
      setUploading(false);
    }
  };

  // ── Payment (Razorpay) ──
  const handlePayment = async () => {
    if (!selectedVendor) return toast.error("Select a vendor");

    const vendorStillOnline = vendors.find((v) => v._id === selectedVendor._id);
    if (!vendorStillOnline?.isOnline || !vendorStillOnline?.shopOpen) {
      toast.error("Vendor is no longer available");
      setStep(2);
      return;
    }

    setPaying(true);
    try {
      const fileSettings = fileConfigs.map(c => ({
        ...c,
        customPages: c.pageOption === "Custom" ? c.customPages : ""
      }));
      
      const initiation = await initiatePayment({
        vendorId: selectedVendor._id,
        fileUrl,
        files: processedFiles.map((f, i) => ({ ...f, config: fileSettings[i] })),
        originalFileName,
        serviceType: fileSettings[0]?.serviceType || "Print",
        pageCount: effectivePageCount,
        quantity: 1,
        pagesPerSheet: 1,
        color: "B&W",
        sides: "Single",
        orientation: "Portrait",
        instructions: "Multiple file order",
        printConfig: fileSettings[0] || {},
        processedUrl,
        thumbnailUrl,
        metadata,
      });

      if (initiation.data.mock) {
        const result = await verifyPayment({
          paymentAttemptId: initiation.data.paymentAttemptId,
          mockPayment: true,
        });
        setOrderDone(result.data);
        toast.success("Order placed in development payment mode");
        window.sessionStorage.clear(); // Clear storage on success
        return;
      }

      if (!(await loadRazorpayScript())) {
        throw new Error("Razorpay failed to load");
      }

      const razorpay = new window.Razorpay({
        key: initiation.data.key,
        amount: initiation.data.amount,
        currency: initiation.data.currency,
        order_id: initiation.data.razorpayOrderId,
        name: "QuickPrint",
        prefill: {
          name: user?.name || "Customer",
          email: user?.email || "customer@example.com"
        },
        handler: async (response) => {
          try {
            const result = await verifyPayment({
              paymentAttemptId: initiation.data.paymentAttemptId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setOrderDone(result.data);
            toast.success("Order placed");
            window.sessionStorage.clear(); // Clear storage on success
          } catch (error) {
            toast.error(error.response?.data?.error || "Payment verification failed");
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      razorpay.on("payment.failed", () => {
        toast.error("Payment failed. No order was created.");
        setPaying(false);
      });
      razorpay.open();
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Unable to start payment");
      setPaying(false);
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

  // ── Order Done Screen ──
  if (orderDone) {
    const { order, otp } = orderDone;
    return (
      <>
        <UserNavbar />
        <div className="page">
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎉</div>
            <h2 style={{ marginBottom: 8 }}>Order Placed!</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Your order has been sent to{" "}
              <strong>{selectedVendor.shopName}</strong>
            </p>
            <p className="text-muted mb-8">Show this OTP at pickup:</p>
            <div className="otp-box" style={{ marginBottom: 24 }}>
              {otp}
            </div>
            <p
              className="text-muted"
              style={{ fontSize: "0.8rem", marginBottom: 24 }}
            >
              Order ID: {order.orderId}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/my-orders")}
            >
              Track My Order →
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Main Render ──
  return (
    <>
      <UserNavbar />
      <div className="page">
        {/* Step Indicator */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 24,
            background: "white",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "var(--shadow)",
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "12px 8px",
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: 600,
                background:
                  i === step
                    ? "var(--brand)"
                    : i < step
                    ? "var(--brand-light)"
                    : "white",
                color:
                  i === step
                    ? "white"
                    : i < step
                    ? "var(--brand)"
                    : "var(--gray-400)",
                borderRight:
                  i < STEPS.length - 1 ? "1px solid var(--gray-200)" : "none",
                transition: "all 0.2s",
              }}
            >
              {i < step ? "✓ " : ""}
              {s}
            </div>
          ))}
        </div>

        {/* STEP 0: Upload */}
        {step === 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Upload Files</h3>
            <div
              className={`upload-zone ${dragging ? "dragging" : ""}`}
              onClick={() => fileInputRef.current.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFileChange(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files)}
              />
              {files.length ? (
                <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
                  <p style={{ fontWeight: 600 }}>{files.length} file(s) selected</p>
                  <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: 16 }}>
                    {files.map((file) => file.name).join(", ")}
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      className="btn btn-gray"
                      style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                      onClick={() => setFiles([])}
                    >
                      Clear All
                    </button>
                    <button
                      className="btn"
                      style={{ fontSize: "0.8rem", padding: "6px 12px", background: "var(--brand-light)", color: "var(--brand)" }}
                      onClick={() => fileInputRef.current.click()}
                    >
                      + Add More Files
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📁</div>
                  <p style={{ fontWeight: 600 }}>
                    Drop files here or click to browse
                  </p>
                  <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                    PDF, DOC, JPG supported
                  </p>
                </div>
              )}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 16 }}
              onClick={handleUpload}
              disabled={uploading || !files.length}
            >
              {uploading ? "Uploading..." : "Upload & Continue →"}
            </button>
          </div>
        )}

        {/* STEP 1: Configure — Chrome-style print dialog */}
        {step === 1 && (
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>🖨️ Print Settings</h3>
            
            {processedFiles.length > 1 && (
              <div style={{ display: "flex", overflowX: "auto", gap: 8, paddingBottom: 12, marginBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
                {processedFiles.map((pf, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveFileIdx(idx)}
                    style={{
                      whiteSpace: "nowrap",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      border: activeFileIdx === idx ? "none" : "1px solid #cbd5e1",
                      background: activeFileIdx === idx ? "var(--brand)" : "white",
                      color: activeFileIdx === idx ? "white" : "var(--gray-600)",
                      cursor: "pointer"
                    }}
                  >
                    {pf.originalName.length > 15 ? pf.originalName.slice(0,15) + "..." : pf.originalName}
                  </button>
                ))}
              </div>
            )}
            
            <p
              className="text-muted"
              style={{ fontSize: "0.85rem", marginBottom: 20, fontWeight: 600 }}
            >
              Configuring: {processedFiles[activeFileIdx]?.originalName}
            </p>

            {/* Service Type */}
            <div className="form-group">
              <label className="input-label">Service Type</label>
              <select
                className="input"
                value={activeConfig.serviceType || ""}
                onChange={(e) => updateConfig("serviceType", e.target.value)}
              >
                <option>Print</option>
                <option>Lamination</option>
                <option>Binding</option>
                <option>Photocopy</option>
              </select>
            </div>

            {/* Pages section */}
            <div className="form-group">
              <label className="input-label">Pages</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {["All", "Custom"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => updateConfig("pageOption", opt)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 6,
                      border:
                        activeConfig.pageOption === opt
                          ? "2px solid var(--brand)"
                          : "1.5px solid var(--gray-200)",
                      background:
                        activeConfig.pageOption === opt ? "var(--brand-light)" : "white",
                      color:
                        activeConfig.pageOption === opt ? "var(--brand)" : "var(--gray-600)",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {activeConfig.pageOption === "All" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label
                    className="input-label"
                    style={{ margin: 0, whiteSpace: "nowrap" }}
                  >
                    Total pages in doc:
                  </label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={activeConfig.totalDocPages || 1}
                    onChange={(e) =>
                      updateConfig("totalDocPages", Math.max(1, +e.target.value))
                    }
                    style={{ width: 80 }}
                  />
                </div>
              )}

              {activeConfig.pageOption === "Custom" && (
                <div>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. 1,3,5-8"
                    value={activeConfig.customPages || ""}
                    onChange={(e) => updateConfig("customPages", e.target.value)}
                  />
                  <p
                    className="text-muted"
                    style={{ fontSize: "0.8rem", marginTop: 4 }}
                  >
                    Use commas and ranges · {parseCustomPages(activeConfig.customPages || "")}{" "}
                    page(s) selected
                  </p>
                </div>
              )}
            </div>

            {/* Pages per sheet */}
            <div className="form-group">
              <label className="input-label">Pages per Sheet</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => updateConfig("pagesPerSheet", n)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 6,
                      border:
                        activeConfig.pagesPerSheet === n
                          ? "2px solid var(--brand)"
                          : "1.5px solid var(--gray-200)",
                      background:
                        activeConfig.pagesPerSheet === n ? "var(--brand-light)" : "white",
                      color:
                        activeConfig.pagesPerSheet === n
                          ? "var(--brand)"
                          : "var(--gray-600)",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Copies */}
            <div className="form-group">
              <label className="input-label">Copies</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  className="btn btn-gray"
                  style={{ padding: "6px 14px", fontSize: "1.1rem" }}
                  onClick={() => updateConfig("quantity", Math.max(1, (activeConfig.quantity || 1) - 1))}
                >
                  −
                </button>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    minWidth: 24,
                    textAlign: "center",
                  }}
                >
                  {activeConfig.quantity || 1}
                </span>
                <button
                  className="btn btn-gray"
                  style={{ padding: "6px 14px", fontSize: "1.1rem" }}
                  onClick={() => updateConfig("quantity", (activeConfig.quantity || 1) + 1)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Color + Sides + Orientation */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              <div className="form-group">
                <label className="input-label">Color</label>
                <select
                  className="input"
                  value={activeConfig.color || ""}
                  onChange={(e) => updateConfig("color", e.target.value)}
                >
                  <option>B&W</option>
                  <option>Color</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Sides</label>
                <select
                  className="input"
                  value={activeConfig.sides || ""}
                  onChange={(e) => updateConfig("sides", e.target.value)}
                >
                  <option>Single</option>
                  <option>Double</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Orientation</label>
                <select
                  className="input"
                  value={activeConfig.orientation || ""}
                  onChange={(e) => updateConfig("orientation", e.target.value)}
                >
                  <option>Portrait</option>
                  <option>Landscape</option>
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div className="form-group">
              <label className="input-label">
                Special Instructions (optional)
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. staple, spiral bind..."
                value={activeConfig.instructions || ""}
                onChange={(e) => updateConfig("instructions", e.target.value)}
              />
            </div>

            {/* Live Price Preview */}
            <div
              style={{
                background: "var(--brand-light)",
                borderRadius: 8,
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <div className="flex-between">
                <span style={{ fontWeight: 600 }}>Estimated Total</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.2rem",
                    color: "var(--brand)",
                  }}
                >
                  ₹{estimatedPrice}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-gray" onClick={() => setStep(0)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={effectivePageCount === 0}
                onClick={() => setStep(2)}
              >
                Select Vendor →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Vendor */}
        {step === 2 && (
          <div className="card">
            <div className="flex-between" style={{ marginBottom: 4 }}>
              <h3>Available Vendors</h3>
              <button
                className="btn btn-gray"
                style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                onClick={async () => {
                  setLoadingVendors(true);
                  try {
                    const res = await getAvailableVendors();
                    setVendors(res.data);
                    toast.success("Vendors refreshed 🔄");
                  } catch {
                    toast.error("Failed to refresh vendors");
                  } finally {
                    setLoadingVendors(false);
                  }
                }}
              >
                🔄 Refresh
              </button>
            </div>

            <p className="text-muted" style={{ marginBottom: 16 }}>
              Only showing online & open shops
            </p>

            {loadingVendors && <p>Loading vendors...</p>}

            {!loadingVendors && vendors.length === 0 && (
              <p>No vendors available</p>
            )}

            {vendors.map((v) => {
              const waitInfo = waitTimeData[v._id];

              return (
                <div
                  key={v._id}
                  className="order-item"
                  onClick={() => setSelectedVendor(v)}
                  style={{
                    cursor: "pointer",
                    borderColor:
                      selectedVendor?._id === v._id
                        ? "var(--brand)"
                        : "var(--gray-200)",
                    padding: "16px",
                    borderRadius: "10px",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                        {v.shopName}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--gray-500)",
                        }}
                      >
                        {v.name}
                      </div>
                    </div>

                    {waitInfo && (
                      <div
                        style={{
                          background: "#f0fdf4",
                          color: "#166534",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                        }}
                      >
                        ~{waitInfo.estimated_wait_minutes} mins
                      </div>
                    )}
                  </div>

                  {waitInfo && (
                    <>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          marginBottom: "4px",
                          fontWeight: 600,
                        }}
                      >
                        Urgency: {waitInfo.urgency}
                      </div>

                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--gray-500)",
                        }}
                      >
                        {waitInfo.message_to_student}
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button className="btn btn-gray" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!selectedVendor}
                onClick={() => setStep(3)}
              >
                Proceed →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Payment */}
        {step === 3 && (
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Order Summary</h3>

            <div
              style={{
                background: "var(--gray-50)",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span className="text-muted">Total Documents</span>
                  <strong>{processedFiles.length || 1}</strong>
              </div>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span className="text-muted">Total Pages (Effective)</span>
                  <strong>{effectivePageCount}</strong>
              </div>
              <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span className="text-muted">Vendor</span>
                  <strong>{selectedVendor?.shopName}</strong>
              </div>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--gray-200)",
                  margin: "12px 0",
                }}
              />
              <div className="flex-between">
                <span style={{ fontWeight: 700 }}>Total</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "1.3rem",
                    color: "var(--brand)",
                  }}
                >
                  ₹{estimatedPrice}
                </span>
              </div>
            </div>

            {selectedVendor && waitTimeData[selectedVendor._id] && (
              <div
                style={{
                  background: "#ecfdf5",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 16,
                  border: "1px solid #bbf7d0",
                }}
              >
                <h4 style={{ marginBottom: 10 }}>⏱ Estimated Ready Time</h4>

                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1.2rem",
                    color: "#166534",
                    marginBottom: 8,
                  }}
                >
                  ~{waitTimeData[selectedVendor._id].estimated_wait_minutes}{" "}
                  mins
                </div>

                <div
                  style={{
                    fontSize: "0.9rem",
                    marginBottom: 6,
                  }}
                >
                  <strong>Urgency:</strong>{" "}
                  {waitTimeData[selectedVendor._id].urgency}
                </div>

                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--gray-600)",
                    marginBottom: 8,
                  }}
                >
                  {waitTimeData[selectedVendor._id].advice}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#065f46",
                    background: "#d1fae5",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    fontWeight: 500,
                  }}
                >
                  * With the limited data we have, actual buffer times may differ. A flat 10 min buffer is included for now.
                </div>
              </div>
            )}

            {/* File preview */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>📄 Document Preview</h4>
              {processedFiles.length > 1 && (
                <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                  {processedFiles.map((processedFile) => (
                    <a
                      key={processedFile.filename}
                      href={processedFile.processedUrl || processedFile.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, color: "inherit", textDecoration: "none" }}
                    >
                      <span>{processedFile.originalName}</span>
                      <span>{processedFile.pageCount} page(s) · Open</span>
                    </a>
                  ))}
                </div>
              )}
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  overflow: "hidden",
                  height: "300px",
                }}
              >
                <iframe
                  src={processedUrl || fileUrl}
                  title="PDF Preview"
                  width="100%"
                  height="100%"
                  style={{ border: "none" }}
                />
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  marginTop: 6,
                  color: "var(--gray-400)",
                }}
              >
                Preview your file before placing order
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  style={{ marginTop: 4 }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    I have checked my file(s) before placing the order
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--gray-500)", marginTop: 2 }}>
                    Note: Orders can only be cancelled for a full refund while in the <strong>Queued</strong> state. 
                    Once the vendor starts printing, cancellations are no longer permitted.
                  </span>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-gray" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handlePayment}
                disabled={!isChecked}
              >
                Pay ₹{estimatedPrice} & Place Order
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
