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
          toast.success("Your enquiry has been sent!");
          formRef.current.reset();
        },
        (err) => {
          console.error(err);
          toast.error("Failed to send. Try again later.");
        }
      )
      .finally(() => setLoading(false));
  };

  return (
    <div className="page-wrapper">
      <div
        className="card"
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "24px 28px",
          borderRadius: 16,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <h3 style={{ marginBottom: 8 }}>Customer Care</h3>
        <p className="small-muted" style={{ marginBottom: 20 }}>
          Have a question or need help? Fill out the form and our team will get
          back to you.
        </p>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label className="input-label">Your Name</label>
            <input
              type="text"
              name="from_name"
              className="input"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="input-label">Phone Number</label>
            <input
              type="tel"
              name="from_phone"
              className="input"
              placeholder="Enter your phone number"
              required
            />
          </div>

          <div>
            <label className="input-label">Your Query</label>
            <textarea
              name="message"
              className="input"
              rows={4}
              placeholder="Write your enquiry here..."
              required
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 8, width: "100%" }}
          >
            {loading ? "Sending..." : "Send Enquiry"}
          </button>
        </form>
      </div>
    </div>
  );
}
