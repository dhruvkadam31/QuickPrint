import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { uploadFile, getAvailableVendors, createOrder } from "../../services/api";
import UserNavbar from "../../components/user/UserNavbar";

const STEPS = ["Upload File", "Configure", "Select Vendor", "Payment"];

export default function Upload() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [originalFileName, setOriginalFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Config
  const [serviceType, setServiceType] = useState("Print");
  const [pageCount, setPageCount] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [color, setColor] = useState("B&W");
  const [sides, setSides] = useState("Single");
  const [orientation, setOrientation] = useState("Portrait");
  const [instructions, setInstructions] = useState("");

  // Vendor
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loadingVendors, setLoadingVendors] = useState(false);

  // Payment
  const [paying, setPaying] = useState(false);
  const [orderDone, setOrderDone] = useState(null);

  const fileInputRef = useRef();

  const pricePerPage = selectedVendor
    ? color === "Color"
      ? selectedVendor.colorPricePerPage
      : selectedVendor.bwPricePerPage
    : color === "Color"
    ? 5
    : 1.5;

  const totalPages = pageCount * quantity;
  const estimatedPrice = +(totalPages * pricePerPage).toFixed(2);

  // Step 3: load vendors
  useEffect(() => {
    if (step === 2) {
      setLoadingVendors(true);
      getAvailableVendors()
        .then((res) => setVendors(res.data))
        .catch(() => toast.error("Could not load vendors"))
        .finally(() => setLoadingVendors(false));
    }
  }, [step]);

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
      setFileUrl(res.data.fileUrl);
      setOriginalFileName(res.data.originalFileName);
      toast.success("File uploaded ✅");
      setStep(1);
    } catch (err) {
      toast.error("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  // ── Payment (Razorpay demo) ──
 const handlePayment = async () => {
  console.log("RAZORPAY KEY:", import.meta.env.VITE_RAZORPAY_KEY_ID);
  if (!selectedVendor) return toast.error("Select vendor");

  const loaded = await loadRazorpayScript();
  if (!loaded) return toast.error("Razorpay failed to load");

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Use environment variable
    amount: estimatedPrice * 100,
    currency: "INR",
    name: "QuickPrint",

    handler: async function (response) {
      try {
        const res = await createOrder({
          userId: user.uid,
          userName: user.displayName || user.email,
          vendorId: selectedVendor._id,
          fileUrl,
          originalFileName,
          serviceType,
          pageCount,
          quantity,
          color,
          sides,
          orientation,
          instructions,
          estimatedPrice,
          paymentId: response.razorpay_payment_id,
        });

        setOrderDone(res.data);
        toast.success("Order placed 🎉");

      } catch (err) {
        toast.error("Order failed");
      }
    }
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

  // ── Render ──
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
              Your order has been sent to <strong>{selectedVendor.shopName}</strong>
            </p>
            <p className="text-muted mb-8">Show this OTP at pickup:</p>
            <div className="otp-box" style={{ marginBottom: 24 }}>{otp}</div>
            <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: 24 }}>
              Order ID: {order.orderId}
            </p>
            <button className="btn btn-primary" onClick={() => navigate("/my-orders")}>
              Track My Order →
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <UserNavbar />
      <div className="page">
        {/* Step Indicator */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "white", borderRadius: 10, overflow: "hidden", boxShadow: "var(--shadow)" }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "12px 8px",
                textAlign: "center",
                fontSize: "0.8rem",
                fontWeight: 600,
                background: i === step ? "var(--brand)" : i < step ? "var(--brand-light)" : "white",
                color: i === step ? "white" : i < step ? "var(--brand)" : "var(--gray-400)",
                borderRight: i < STEPS.length - 1 ? "1px solid var(--gray-200)" : "none",
                transition: "all 0.2s",
              }}
            >
              {i < step ? "✓ " : ""}{s}
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
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileChange(e.dataTransfer.files[0]); }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📄</div>
              {file ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{file.name}</div>
                  <div className="text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop file here or click to browse</div>
                  <div className="text-muted" style={{ fontSize: "0.8rem" }}>PDF, DOC, DOCX, JPG, PNG — max 20MB</div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 16 }}
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? "Uploading..." : "Upload & Continue →"}
            </button>
          </div>
        )}

        {/* STEP 1: Configure */}
        {step === 1 && (
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Print Configuration</h3>

            <div className="form-group">
              <label className="input-label">Service Type</label>
              <select className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                <option>Print</option>
                <option>Lamination</option>
                <option>Binding</option>
                <option>Photocopy</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="input-label">Number of Pages</label>
                <input className="input" type="number" min={1} value={pageCount} onChange={(e) => setPageCount(+e.target.value)} />
              </div>
              <div className="form-group">
                <label className="input-label">Copies</label>
                <input className="input" type="number" min={1} value={quantity} onChange={(e) => setQuantity(+e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="input-label">Color</label>
                <select className="input" value={color} onChange={(e) => setColor(e.target.value)}>
                  <option>B&W</option>
                  <option>Color</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Sides</label>
                <select className="input" value={sides} onChange={(e) => setSides(e.target.value)}>
                  <option>Single</option>
                  <option>Double</option>
                </select>
              </div>
              <div className="form-group">
                <label className="input-label">Orientation</label>
                <select className="input" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                  <option>Portrait</option>
                  <option>Landscape</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Special Instructions (optional)</label>
              <input className="input" type="text" placeholder="e.g. staple, spiral bind..." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            </div>

            {/* Price preview */}
            <div style={{ background: "var(--brand-light)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
              <div className="flex-between">
                <span className="text-muted">{totalPages} pages × ₹{pricePerPage}/page</span>
                <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--brand)" }}>≈ ₹{estimatedPrice}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-gray" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                Select Vendor →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Vendor */}
        {step === 2 && (
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>Available Vendors</h3>
            <p className="text-muted" style={{ marginBottom: 16 }}>Only showing online & open shops</p>

            {loadingVendors && <p className="text-muted text-center">Loading vendors...</p>}
            {!loadingVendors && vendors.length === 0 && (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>😔</div>
                <p>No vendors available right now. Try again later.</p>
              </div>
            )}

            {vendors.map((v) => (
              <div
                key={v._id}
                className="order-item"
                onClick={() => setSelectedVendor(v)}
                style={{
                  cursor: "pointer",
                  borderColor: selectedVendor?._id === v._id ? "var(--brand)" : "var(--gray-200)",
                  background: selectedVendor?._id === v._id ? "var(--brand-light)" : "white",
                }}
              >
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 700 }}>{v.shopName}</div>
                    <div className="text-muted">{v.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--success)", fontWeight: 600 }}>● Open</div>
                    <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                      B&W ₹{v.bwPricePerPage}/pg · Color ₹{v.colorPricePerPage}/pg
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn btn-gray" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!selectedVendor} onClick={() => setStep(3)}>
                Proceed to Payment →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Payment */}
        {step === 3 && (
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Order Summary</h3>

            <div style={{ background: "var(--gray-50)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              {[
                ["File", originalFileName],
                ["Service", serviceType],
                ["Pages", `${pageCount} × ${quantity} copies = ${totalPages} pages`],
                ["Color", color],
                ["Sides", sides],
                ["Vendor", selectedVendor?.shopName],
              ].map(([k, v]) => (
                <div key={k} className="flex-between" style={{ marginBottom: 8 }}>
                  <span className="text-muted">{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
              <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "12px 0" }} />
              <div className="flex-between">
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontWeight: 700, fontSize: "1.3rem", color: "var(--brand)" }}>₹{estimatedPrice}</span>
              </div>
            </div>

            <div style={{ background: "var(--warning-light)", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: "0.85rem", color: "#92400e" }}>
              💳 Demo mode — payment will be simulated (no real charge)
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-gray" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-success" style={{ flex: 1 }} disabled={paying} onClick={handlePayment}>
                {paying ? "Processing..." : `Pay ₹${estimatedPrice} & Place Order`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
