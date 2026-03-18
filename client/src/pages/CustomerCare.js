// src/pages/CustomerCare.js
import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";

const FAQS = [
  {
    q: "How do I place a print order?",
    a: "Go to 'Upload Files', select your service type and print shop, upload your document, configure your print settings (color, sides, orientation), and proceed to payment. Once paid, your order enters the shop's queue automatically.",
  },
  {
    q: "What file formats are supported?",
    a: "We support PDF, Word documents (.docx), and images (JPG, PNG). For best results, we recommend uploading PDFs as they preserve formatting perfectly.",
  },
 
  {
    q: "How do I track my order?",
    a: "Visit 'My Orders' to see real-time queue position, estimated wait time, and status updates. Queue positions refresh automatically every 15 seconds.",
  },
  {
    q: "When will my order be ready?",
    a: "You can see the estimated wait time on the My Orders page. Once your order status changes to 'Ready', you'll see it highlighted — head to the shop to pick it up.",
  },
  {
    q: "Can I cancel my order after payment?",
    a: "Orders cannot be cancelled once payment is confirmed and the order is in the queue. If you have an issue, please contact us using the form above and we'll do our best to help.",
  },
  {
    q: "What if the shop is closed?",
    a: "Closed shops are clearly marked with a 🔴 badge and the order button is disabled for them. Only open shops can receive new orders.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes. All payments are processed securely through Razorpay, a PCI-DSS compliant payment gateway. We never store your card details.",
  },
  {
    q: "How do I get an invoice for my order?",
    a: "Open 'My Orders', find your order, and click the 'Invoice' button. You can view, print, or download the invoice as an HTML file.",
  },
  ];

export default function CustomerCare() {
  const formRef             = useRef();
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    emailjs
      .sendForm("service_123456", "template_123456", formRef.current, "_IjkGHBXOLusMOfyk")
      .then(
        () => {
          toast.success("Enquiry sent! We'll get back to you soon.");
          formRef.current.reset();
        },
        (err) => {
          console.error(err);
          toast.error("Failed to send. Please try again.");
        }
      )
      .finally(() => setLoading(false));
  };

  const toggleFaq = (i) => setOpenFaq(openFaq === i ? null : i);

  return (
    <div className="page-wrapper" style={{ maxWidth: 720 }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <h2>Customer Care</h2>
        <p>We're here to help. Send us a message or browse the FAQs below.</p>
      </div>

      {/* ── 1. Contact form ── */}
      <div className="card">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>
            Send us a message
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Our team will get back to you within 24 hours.
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Your Name</label>
              <input
                type="text"
                name="from_name"
                className="input"
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                name="from_phone"
                className="input"
                placeholder="+91 00000 00000"
                required
              />
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: 0 }}>
            <label className="input-label">Your Query</label>
            <textarea
              name="message"
              className="input"
              rows={4}
              placeholder="Describe your issue or question in detail…"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sending…" : "Send Message →"}
          </button>
        </form>
      </div>

      {/* ── 2. Contact channels ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { icon: "📞", title: "Call Us", desc: "+91 98765 43210", sub: "Mon–Sat, 9am–7pm" },
          { icon: "📧", title: "Email Us", desc: "support@quickprint.com", sub: "Reply within 24 hrs" },
        ].map(({ icon, title, desc, sub }) => (
          <div
            key={title}
            className="card"
            style={{ marginBottom: 0, textAlign: "center", padding: "20px 16px" }}
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>
              {title}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--accent-text)" }}>{desc}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── 3. FAQ ── */}
      <div className="card">
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>
            Frequently Asked Questions
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Quick answers to common questions about QuickPrint.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{
                border: "1.5px solid",
                borderColor: openFaq === i ? "var(--accent)" : "var(--border)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                transition: "border-color 0.18s ease",
              }}
            >
              {/* Question button */}
              <button
                onClick={() => toggleFaq(i)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  background: openFaq === i ? "var(--accent-light)" : "var(--surface)",
                  border: "none",
                  cursor: "pointer",
                  gap: 12,
                  textAlign: "left",
                  transition: "background 0.18s ease",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: openFaq === i ? "var(--accent-text)" : "var(--text-primary)",
                    lineHeight: 1.4,
                    flex: 1,
                  }}
                >
                  {faq.q}
                </span>
                <span
                  style={{
                    fontSize: 20,
                    color: openFaq === i ? "var(--accent-text)" : "var(--text-muted)",
                    fontWeight: 300,
                    flexShrink: 0,
                    transform: openFaq === i ? "rotate(45deg)" : "none",
                    transition: "transform 0.2s ease",
                    lineHeight: 1,
                    display: "inline-block",
                  }}
                >
                  +
                </span>
              </button>

              {/* Answer */}
              {openFaq === i && (
                <div
                  style={{
                    padding: "12px 16px 14px",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    background: "var(--accent-light)",
                    borderTop: "1px solid rgba(29,78,216,0.1)",
                    animation: "slideUp 0.15s ease",
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom tip ── */}
      <div className="info-banner info-banner-blue" style={{ marginTop: 4, marginBottom: 24 }}>
        <span>💡</span>
        <span>
          Still can't find what you're looking for? Use the form above — we reply within 24 hours.
        </span>
      </div>

    </div>
  );
}