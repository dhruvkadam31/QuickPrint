import { useState } from "react";
import VendorLayout from "../../components/vendor/VendorLayout";
import { updateVendorSettings } from "../../services/api";
import toast from "react-hot-toast";

export default function VendorSettings() {
  const vendorData = JSON.parse(localStorage.getItem("vendorData") || "{}");

  const [bw, setBw] = useState(vendorData.bwPricePerPage || 1.5);
  const [color, setColor] = useState(vendorData.colorPricePerPage || 5.0);
  const [binding, setBinding] = useState(vendorData.bindingPrice || 20.0);
  const [shopOpen, setShopOpen] = useState(vendorData.shopOpen ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateVendorSettings(vendorData.vendorId, {
        bwPricePerPage: parseFloat(bw),
        colorPricePerPage: parseFloat(color),
        bindingPrice: parseFloat(binding),
        shopOpen,
      });
      // Update localStorage
      const updated = { ...vendorData, ...res.data.vendor, vendorId: vendorData.vendorId };
      localStorage.setItem("vendorData", JSON.stringify(updated));
      toast.success("Settings saved ✅");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, onChange, prefix = "₹", suffix = "/page" }) => (
    <div className="form-group">
      <label className="input-label">{label}</label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-600)", fontWeight: 600 }}>
          {prefix}
        </span>
        <input
          className="input"
          type="number"
          step="0.5"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingLeft: 28 }}
        />
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", fontSize: "0.85rem" }}>
          {suffix}
        </span>
      </div>
    </div>
  );

  return (
    <VendorLayout>
      <h2 style={{ marginBottom: 8 }}>Settings</h2>
      <p className="text-muted" style={{ marginBottom: 24 }}>Configure your shop pricing and availability</p>

      <div className="card" style={{ maxWidth: 500 }}>
        <h3 style={{ marginBottom: 16 }}>💰 Pricing</h3>
        <Field label="B&W Price per Page" value={bw} onChange={setBw} />
        <Field label="Color Price per Page" value={color} onChange={setColor} />
        <Field label="Binding Price" value={binding} onChange={setBinding} suffix="" />

        <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />

        <h3 style={{ marginBottom: 16 }}>🏪 Shop Status</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setShopOpen(true)}
            className={`btn ${shopOpen ? "btn-success" : "btn-gray"}`}
          >
            🟢 Open
          </button>
          <button
            onClick={() => setShopOpen(false)}
            className={`btn ${!shopOpen ? "btn-danger" : "btn-gray"}`}
          >
            🔴 Closed
          </button>
          <span className="text-muted" style={{ fontSize: "0.85rem" }}>
            Currently: <strong>{shopOpen ? "Open" : "Closed"}</strong>
          </span>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--gray-200)", margin: "20px 0" }} />

        <div style={{ background: "var(--gray-50)", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: "0.85rem" }}>
          <div className="fw-600" style={{ marginBottom: 8 }}>Commission Info</div>
          <div className="text-muted">Platform takes 10% commission on each order.</div>
          <div className="text-muted">You keep <strong>90%</strong> of every order's value.</div>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </VendorLayout>
  );
}
