// src/App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./Firebase";

import AllOrders from "./pages/AllOrders";
import NavBar from "./components/NavBar";
import SignInSignUp from "./pages/SignInSignUp";
import UploadFiles from "./pages/UploadFiles";
import QueueStatus from "./pages/QueueStatus";
import MyOrders from "./pages/MyOrders";
import CustomerCare from "./pages/CustomerCare";
import AdminLogin from "./pages/AdminLogin";  
import AdminDashboard from "./pages/AdminDashboard";
import VendorLogin from "./VendorLogin";
import VendorDashboard from "./pages/vendor/VendorDashboardPage";

// Create Vendor Context for global state management
export const VendorContext = React.createContext();

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  // Fetch vendors for global access (optional)
  useEffect(() => {
    if (authChecked && !user) {
      // Fetch vendors for public access
      const fetchVendors = async () => {
        try {
          const res = await fetch("http://localhost:5000/vendors");
          const data = await res.json();
          if (data.success) {
            setVendors(data.vendors);
          }
        } catch (err) {
          console.error("Error fetching vendors:", err);
        }
      };
      fetchVendors();
    }
  }, [authChecked, user]);

  // Check authentication status
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isVendor = localStorage.getItem("isVendor") === "true";
  const vendorData = localStorage.getItem("vendorData");

  console.log("🔐 App.js - Authentication State:", {
    user: user?.email,
    isAdmin,
    isVendor,
    hasVendorData: !!vendorData
  });

  if (!authChecked) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading QuickPrint...
      </div>
    );
  }

  return (
    <VendorContext.Provider value={{ vendors, setVendors }}>
      <Router>
        {/* ✅ FIXED: Show NavBar ONLY for regular users and admin */}
        {/* ✅ DO NOT show NavBar for vendors - VendorDashboard has its own NavBar */}
        {(user && !isVendor && !isAdmin) || isAdmin ? <NavBar user={user} /> : null}
        
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<SignInSignUp />} />
          <Route path="/vendor_login" element={<VendorLogin />} />
          <Route path="/admin_login" element={<AdminLogin />} />

          {/* ✅ Vendor Routes - VendorDashboard has its OWN NavBar inside */}
          <Route 
            path="/vendor/dashboard" 
            element={
              isVendor && vendorData ? (
                <VendorDashboard />
              ) : (
                <Navigate to="/vendor_login" replace />
              )
            } 
          />

          {/* ✅ Admin Routes */}
          <Route 
            path="/admin" 
            element={
              isAdmin ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/admin_login" replace />
              )
            } 
          />
          <Route 
            path="/all-orders" 
            element={
              isAdmin ? (
                <AllOrders />
              ) : (
                <Navigate to="/admin_login" replace />
              )
            } 
          />

          {/* ✅ User Routes - Only for regular authenticated users (not admin/vendor) */}
          <Route 
            path="/upload" 
            element={
              user && !isAdmin && !isVendor ? (
                <UploadFiles user={user} />
              ) : isAdmin ? (
                <Navigate to="/admin" replace />
              ) : isVendor ? (
                <Navigate to="/vendor/dashboard" replace />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/orders" 
            element={
              user && !isAdmin && !isVendor ? (
                <MyOrders user={user} />
              ) : isAdmin ? (
                <Navigate to="/admin" replace />
              ) : isVendor ? (
                <Navigate to="/vendor/dashboard" replace />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/care" 
            element={
              user && !isAdmin && !isVendor ? (
                <CustomerCare />
              ) : isAdmin ? (
                <Navigate to="/admin" replace />
              ) : isVendor ? (
                <Navigate to="/vendor/dashboard" replace />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          <Route 
            path="/queue" 
            element={
              // Queue is accessible by all authenticated users
              user || isAdmin || isVendor ? (
                <QueueStatus />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* ✅ Default redirect based on user type */}
          <Route 
            path="*" 
            element={
              isVendor ? (
                <Navigate to="/vendor/dashboard" replace />
              ) : isAdmin ? (
                <Navigate to="/admin" replace />
              ) : user ? (
                <Navigate to="/upload" replace />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
        </Routes>
      </Router>
    </VendorContext.Provider>
  );
}