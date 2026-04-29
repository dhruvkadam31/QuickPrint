import { useState } from "react";
import VendorLayout from "../../components/vendor/VendorLayout";
import { verifyOTP } from "../../services/api";
import toast from "react-hot-toast";

export default function VendorPickup() {
  const vendorData = JSON.parse(localStorage.getItem("vendorData") || "{}");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [done, setDone] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) return toast.error("OTP must be 6 digits");
    setLoading(true);
    setOrder(null);
    setDone(false);
    try {
      const res = await verifyOTP({ otp, vendorId: vendorData.vendorId });
      setOrder(res.data.order);
      setDone(true);
      setOtp("");
      toast.success("✅ OTP verified! Order marked as Picked Up");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <VendorLayout>
      <h2 style={{ marginBottom: 8 }}>OTP Pickup</h2>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Enter the customer's 6-digit OTP to confirm pickup
      </p>

      <div className="card" style={{ maxWidth: 420 }}>
        <div className="form-group">
          <label className="input-label">Customer OTP</label>
          <input
            className="input"
            type="text"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.4rem", letterSpacing: "8px", textAlign: "center" }}
          />
        </div>
        <button
          className="btn btn-success btn-full"
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
        >
          {loading ? "Verifying..." : "Verify OTP & Mark Picked Up"}
        </button>
      </div>

      {done && order && (
        <div className="card" style={{ maxWidth: 420, marginTop: 16, border: "2px solid var(--success)" }}>
          <div style={{ color: "var(--success)", fontWeight: 700, marginBottom: 12 }}>
            ✅ Order Completed!
          </div>
          <div style={{ display: "grid", gap: 8, fontSize: "0.9rem" }}>
            {[
              ["Order", `#${order.orderCode || order.orderId.slice(-4)}`],
              ["Service", order.serviceType],
              ["Pages", order.totalPages],
              ["Amount", `₹${order.estimatedPrice}`],
              ["Your Earnings", `₹${order.vendorEarnings?.toFixed(2)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex-between">
                <span className="text-muted">{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </VendorLayout>
  );
}
