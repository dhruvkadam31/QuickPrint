// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./Firebase";

import AllOrders       from "./pages/AllOrders";
import NavBar          from "./components/NavBar";
import SignInSignUp    from "./pages/SignInSignUp";
import UploadFiles     from "./pages/UploadFiles";
import QueueStatus     from "./pages/QueueStatus";
import MyOrders        from "./pages/MyOrders";
import CustomerCare    from "./pages/CustomerCare";
import AdminLogin      from "./pages/AdminLogin";
import AdminDashboard  from "./pages/AdminDashboard";
import VendorLogin     from "./pages/VendorLogin";
import VendorDashboard from "./pages/VendorDashboard";

export const VendorContext = React.createContext();

// ── Inner app wrapped inside Router so useLocation works ─────────────────────
function AppInner({ user, vendors, setVendors }) {
  const location = useLocation();

  // ✅ Initialise directly from localStorage so there's NO blank gap on first render
  // If we start with false/null, the route guard fires before useEffect and
  // redirects vendor to /vendor_login before state is populated
  const [isAdmin, setIsAdmin]     = useState(() => localStorage.getItem("isAdmin") === "true");
  const [isVendor, setIsVendor]   = useState(() => localStorage.getItem("isVendor") === "true");
  const [vendorData, setVendorData] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vendorData")); }
    catch { return null; }
  });

  useEffect(() => {
    const adminFlag  = localStorage.getItem("isAdmin")  === "true";
    const vendorFlag = localStorage.getItem("isVendor") === "true";
    const raw        = localStorage.getItem("vendorData");

    let parsed = null;
    if (vendorFlag && raw) {
      try { parsed = JSON.parse(raw); }
      catch {
        localStorage.removeItem("isVendor");
        localStorage.removeItem("vendorData");
      }
    }

    // Corrupt / missing vendorData → clear session
    if (vendorFlag && !parsed) {
      localStorage.removeItem("isVendor");
      localStorage.removeItem("vendorData");
      setIsVendor(false);
      setVendorData(null);
    } else {
      setIsVendor(vendorFlag);
      setVendorData(parsed);
    }

    setIsAdmin(adminFlag);
  }, [location.pathname]); // ← re-runs on every navigation

  // Decide whether to show NavBar
  // Show for: regular user, admin
  // Hide for: vendor (VendorDashboard has its own), logged-out
  const showNavBar = (user && !isVendor && !isAdmin) || isAdmin;

  return (
    <>
      {showNavBar && <NavBar user={user} />}

      <Routes>
        {/* ── Public ── */}
        <Route path="/"             element={<SignInSignUp />} />
        <Route path="/vendor_login" element={<VendorLogin />} />
        <Route path="/admin_login"  element={<AdminLogin />} />

        {/* ── Vendor ── */}
        <Route
          path="/vendor/dashboard"
          element={
            isVendor && vendorData
              ? <VendorDashboard />
              : <Navigate to="/vendor_login" replace />
          }
        />

        {/* ── Admin ── */}
        <Route
          path="/admin"
          element={isAdmin ? <AdminDashboard /> : <Navigate to="/admin_login" replace />}
        />
        <Route
          path="/all-orders"
          element={isAdmin ? <AllOrders /> : <Navigate to="/admin_login" replace />}
        />
        <Route
          path="/queue"
          element={
            user || isAdmin || isVendor
              ? <QueueStatus />
              : <Navigate to="/" replace />
          }
        />

        {/* ── Regular user ── */}
        <Route
          path="/upload"
          element={
            user && !isAdmin && !isVendor ? <UploadFiles user={user} />
            : isAdmin  ? <Navigate to="/admin"             replace />
            : isVendor ? <Navigate to="/vendor/dashboard"  replace />
            : <Navigate to="/" replace />
          }
        />
        <Route
          path="/orders"
          element={
            user && !isAdmin && !isVendor ? <MyOrders user={user} />
            : isAdmin  ? <Navigate to="/admin"             replace />
            : isVendor ? <Navigate to="/vendor/dashboard"  replace />
            : <Navigate to="/" replace />
          }
        />
        <Route
          path="/care"
          element={
            user && !isAdmin && !isVendor ? <CustomerCare />
            : isAdmin  ? <Navigate to="/admin"             replace />
            : isVendor ? <Navigate to="/vendor/dashboard"  replace />
            : <Navigate to="/" replace />
          }
        />

        {/* ── Catch-all ── */}
        <Route
          path="*"
          element={
            isVendor ? <Navigate to="/vendor/dashboard" replace />
            : isAdmin ? <Navigate to="/admin"           replace />
            : user    ? <Navigate to="/upload"          replace />
            :           <Navigate to="/"               replace />
          }
        />
      </Routes>
    </>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]           = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [vendors, setVendors]     = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  if (!authChecked) {
    return (
      <div style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        height: "100vh", gap: 16, color: "var(--text-muted)",
      }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Loading QuickPrint…</span>
      </div>
    );
  }

  return (
    <VendorContext.Provider value={{ vendors, setVendors }}>
      <Router>
        <AppInner user={user} vendors={vendors} setVendors={setVendors} />
      </Router>
    </VendorContext.Provider>
  );
}