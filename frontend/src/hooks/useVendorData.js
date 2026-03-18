// src/hooks/useVendorData.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function useVendorData() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const vendorData = localStorage.getItem("vendorData");
    const isVendor = localStorage.getItem("isVendor") === "true";

    if (!isVendor || !vendorData) {
      navigate("/vendor_login");
      return;
    }

    setVendor(JSON.parse(vendorData));
    setLoading(false);
  }, [navigate]);

  return { vendor, loading };
}