import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import {
  uploadFile,
  getAvailableVendors,
  createOrder,
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

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [processedUrl, setProcessedUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Config
  const [serviceType, setServiceType] = useState("Print");
  const [pageOption, setPageOption] = useState("All");
  const [customPages, setCustomPages] = useState("");
  const [totalDocPages, setTotalDocPages] = useState(1); // total pages in doc
  const [pagesPerSheet, setPagesPerSheet] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState("B&W");
  const [sides, setSides] = useState("Single");
  const [orientation, setOrientation] = useState("Portrait");
  const [instructions, setInstructions] = useState("");

  // Vendor
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [waitTimeData, setWaitTimeData] = useState({});
  // Payment
  const [paying, setPaying] = useState(false);
  const [orderDone, setOrderDone] = useState(null);
  const [isChecked, setIsChecked] = useState(false);

  const fileInputRef = useRef();

  // Compute effective page count
  const effectivePageCount =
    pageOption === "All" ? totalDocPages : parseCustomPages(customPages) || 0;

  // Pages printed = ceil(effectivePageCount / pagesPerSheet)
  const printedSheets = Math.ceil(effectivePageCount / pagesPerSheet) || 0;

  const pricePerPage = selectedVendor
    ? color === "Color"
      ? selectedVendor.colorPricePerPage
      : selectedVendor.bwPricePerPage
    : color === "Color"
    ? 5
    : 1.5;

  const totalSheets = printedSheets * quantity;
  const estimatedPrice = +(totalSheets * pricePerPage).toFixed(2);

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
              const waitRes = await getWaitTimePrediction();
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
  const handleFileChange = (f) => {
    if (!f) return;
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadFile(fd);

      // Set processed file data
      setFileUrl(res.data.fileUrl || "");
      setOriginalFileName(res.data.originalName || file.name);
      setTotalDocPages(res.data.pageCount || 1); // Automatically detected page count
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
    const vendorStillOnline = vendors.find((v) => v._id === selectedVendor._id);
    if (!vendorStillOnline?.isOnline || !vendorStillOnline?.shopOpen) {
      toast.error("Vendor is no longer available");
      setStep(2);
      return;
    }

    if (!selectedVendor) return toast.error("Select vendor");

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
    const isMock = !razorpayKey || razorpayKey === "rzp_test_placeholder" || razorpayKey.includes("demo");

    if (isMock) {
      setPaying(true);
      try {
        const res = await createOrder({
          userId: user.uid,
          userName: user.displayName || user.email,
          userEmail: user.email,
          vendorId: selectedVendor._id,
          fileUrl,
          originalFileName,
          serviceType,
          pageCount: effectivePageCount,
          quantity,
          color,
          sides,
          orientation,
          instructions,
          estimatedPrice,
          paymentId: `sim_pay_${Date.now()}`,
          printConfig,
          processedUrl,
          thumbnailUrl,
          metadata,
          predictedWaitTime: waitTimeData[selectedVendor._id]?.predicted_wait_time || 10,
        });
        setOrderDone(res.data);
        toast.success("Order placed successfully (Sandbox Mode)!");
      } catch (err) {
        toast.error("Order failed: " + (err.response?.data?.error || err.message));
      } finally {
        setPaying(false);
      }
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) return toast.error("Razorpay failed to load");

    const options = {
      key: razorpayKey,
      amount: Math.round(estimatedPrice * 100),
      currency: "INR",
      name: "QuickPrint",
      handler: async function (response) {
        try {
          const res = await createOrder({
            userId: user.uid,
            userName: user.displayName || user.email,
            userEmail: user.email,
            vendorId: selectedVendor._id,
            fileUrl,
            originalFileName,
            serviceType,
            pageCount: effectivePageCount,
            quantity,
            color,
            sides,
            orientation,
            instructions,
            estimatedPrice,
            paymentId: response.razorpay_payment_id,
            printConfig,
            processedUrl,
            thumbnailUrl,
            metadata,
            predictedWaitTime: waitTimeData[selectedVendor._id]?.predicted_wait_time || 10,
          });
          setOrderDone(res.data);
          toast.success("Order placed 🎉");
        } catch (err) {
          toast.error("Order failed: " + (err.response?.data?.error || err.message));
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
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
            <h3 style={{ marginBottom: 16 }}>Upload Your File</h3>
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
                handleFileChange(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
              {file ? (
                <div>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
                  <p style={{ fontWeight: 600 }}>{file.name}</p>
                  <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>📁</div>
                  <p style={{ fontWeight: 600 }}>
                    Drop file here or click to browse
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
              disabled={uploading || !file}
            >
              {uploading ? "Uploading..." : "Upload & Continue →"}
            </button>
          </div>
        )}

        {/* STEP 1: Configure — Chrome-style print dialog */}
        {step === 1 && (
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>🖨️ Print Settings</h3>
            <p
              className="text-muted"
              style={{ fontSize: "0.85rem", marginBottom: 20 }}
            >
              {originalFileName}
            </p>

            {/* Service Type */}
            <div className="form-group">
              <label className="input-label">Service Type</label>
              <select
                className="input"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
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
                    onClick={() => setPageOption(opt)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 6,
                      border:
                        pageOption === opt
                          ? "2px solid var(--brand)"
                          : "1.5px solid var(--gray-200)",
                      background:
                        pageOption === opt ? "var(--brand-light)" : "white",
                      color:
                        pageOption === opt ? "var(--brand)" : "var(--gray-600)",
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {pageOption === "All" && (
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
                    value={totalDocPages}
                    onChange={(e) =>
                      setTotalDocPages(Math.max(1, +e.target.value))
                    }
                    style={{ width: 80 }}
                  />
                </div>
              )}

              {pageOption === "Custom" && (
                <div>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. 1,3,5-8"
                    value={customPages}
                    onChange={(e) => setCustomPages(e.target.value)}
                  />
                  <p
                    className="text-muted"
                    style={{ fontSize: "0.8rem", marginTop: 4 }}
                  >
                    Use commas and ranges · {parseCustomPages(customPages)}{" "}
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
                    onClick={() => setPagesPerSheet(n)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 6,
                      border:
                        pagesPerSheet === n
                          ? "2px solid var(--brand)"
                          : "1.5px solid var(--gray-200)",
                      background:
                        pagesPerSheet === n ? "var(--brand-light)" : "white",
                      color:
                        pagesPerSheet === n
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
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
                  {quantity}
                </span>
                <button
                  className="btn btn-gray"
                  style={{ padding: "6px 14px", fontSize: "1.1rem" }}
                  onClick={() => setQuantity(quantity + 1)}
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
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                >
                  <option>B&W</option>
                  <option>Color</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Sides</label>
                <select
                  className="input"
                  value={sides}
                  onChange={(e) => setSides(e.target.value)}
                >
                  <option>Single</option>
                  <option>Double</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Orientation</label>
                <select
                  className="input"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
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
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
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
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--gray-500)",
                  marginBottom: 6,
                }}
              >
                {effectivePageCount} pages ÷ {pagesPerSheet}/sheet ={" "}
                {printedSheets} sheet(s) × {quantity} cop
                {quantity > 1 ? "ies" : "y"} = {totalSheets} sheet(s) × ₹
                {pricePerPage}
              </div>
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
              {[
                ["File", originalFileName],
                ["Service", serviceType],
                [
                  "Pages",
                  pageOption === "All" ? `All (${totalDocPages})` : customPages,
                ],
                ["Pages/Sheet", pagesPerSheet],
                ["Copies", quantity],
                ["Color", color],
                ["Sides", sides],
                ["Orientation", orientation],
                ["Vendor", selectedVendor?.shopName],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex-between"
                  style={{ marginBottom: 8 }}
                >
                  <span className="text-muted">{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
              {instructions && (
                <div className="flex-between" style={{ marginBottom: 8 }}>
                  <span className="text-muted">Instructions</span>
                  <strong style={{ maxWidth: "60%", textAlign: "right" }}>
                    {instructions}
                  </strong>
                </div>
              )}
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
                  }}
                >
                  {waitTimeData[selectedVendor._id].advice}
                </div>
              </div>
            )}

            <div
              style={{
                background: "var(--warning-light)",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: "0.85rem",
                color: "#92400e",
              }}
            >
              💳 Demo mode — payment will be simulated (no real charge)
            </div>

            {/* File preview */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8 }}>📄 File Preview</h4>
              <div
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  overflow: "hidden",
                  height: "300px",
                }}
              >
                <iframe
                  src={fileUrl}
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

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                />
                <span style={{ fontSize: "0.9rem" }}>
                  I have checked my PDF before placing order
                </span>
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
