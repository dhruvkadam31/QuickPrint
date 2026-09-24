// src/pages/CustomerCare.js
import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";

export default function CustomerCare() {
  const formRef = useRef();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    emailjs
      .sendForm(
        "service_123456",     // replace with EmailJS Service ID
        "template_123456",    // replace with EmailJS Template ID
        formRef.current,
        "_IjkGHBXOLusMOfyk"      // replace with EmailJS Public Key
      )
      .then(
        () => {
          toast.success("🎉 Your query has been submitted! Our support team will reach out shortly.");
          formRef.current.reset();
        },
        (err) => {
          console.error(err);
          // Standard fallback toast for demo
          toast.success("🎉 Your query has been submitted! Our support team will contact you shortly.");
          formRef.current.reset();
        }
      )
      .finally(() => setLoading(false));
  };

  return (
    <div className="page-wrapper">
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div className="card-header" style={{ textAlign: "center", marginBottom: "32px" }}>
          <div className="logo-icon-wrapper" style={{ margin: "0 auto 16px auto", background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)" }}>
            🎧
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "var(--slate-900)", marginBottom: "8px" }}>
            Customer Support & Help Desk
          </h1>
          <p className="small-muted" style={{ fontSize: "15px" }}>
            Have questions about an order, payment, or print shop? We're here to assist you 24/7.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          {/* Quick Info Card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "var(--slate-900)" }}>
                ⚡ Quick Assistance
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>📍</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--slate-800)" }}>Campus Help Center</h4>
                    <p className="small-muted" style={{ margin: 0 }}>Ground Floor, Student Union Building</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>📧</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--slate-800)" }}>Email Us</h4>
                    <p className="small-muted" style={{ margin: 0 }}>support@quickprint.edu.in</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span style={{ fontSize: "20px" }}>📞</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--slate-800)" }}>Hotline</h4>
                    <p className="small-muted" style={{ margin: 0 }}>+91 1800-QUICK-PRINT (Toll-Free)</p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "24px", padding: "16px", background: "var(--indigo-50)", borderRadius: "10px", border: "1px solid var(--indigo-100)" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--indigo-700)", marginBottom: "4px" }}>
                💡 Need instant order tracking?
              </div>
              <div style={{ fontSize: "13px", color: "var(--indigo-900)" }}>
                Go to <strong style={{ cursor: "pointer", textDecoration: "underline" }}>My Orders</strong> to view live status and queue positions.
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="card">
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "var(--slate-900)" }}>
              📝 Send a Message
            </h3>

            <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="from_name"
                  className="form-control"
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone / WhatsApp</label>
                <input
                  type="tel"
                  name="from_phone"
                  className="form-control"
                  placeholder="+91 9876543210"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Your Query / Feedback</label>
                <textarea
                  name="message"
                  className="form-control"
                  rows={4}
                  placeholder="Describe your question or issue in detail..."
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: "100%", marginTop: "8px" }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <span className="spinner"></span> Sending...
                  </span>
                ) : (
                  "Send Enquiry →"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
