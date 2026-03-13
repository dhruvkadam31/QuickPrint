import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./Firebase";

import AllOrders from "./pages/AllOrders";
import NavBar from "./components/NavBar";
import SignInSignUp from "./auth/SignInSignUp";
import UploadFiles from "./pages/UploadFiles";
import QueueStatus from "./pages/QueueStatus";
import MyOrders from "./pages/MyOrders";
import CustomerCare from "./pages/CustomerCare";
import AdminLogin from "./auth/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status from localStorage
  useEffect(() => {
    const adminStatus = localStorage.getItem("isAdmin") === "true";
    setIsAdmin(adminStatus);
  }, []);

  // Firebase user auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
      
      // Check if user is admin (you can also check against a list)
      if (u?.email === "admin@quickprint.com") {
        localStorage.setItem("isAdmin", "true");
        setIsAdmin(true);
      }
    });
    return unsubscribe;
  }, []);

  if (!authChecked) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="skeleton" style={{ width: 200, height: 40 }}></div>
      </div>
    );
  }

  return (
    <Router>
      {/* Show navbar for logged-in users (except on admin routes) */}
      {user && !window.location.pathname.startsWith('/admin') && <NavBar user={user} isAdmin={isAdmin} />}
      
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin_login" element={<AdminLogin setIsAdmin={setIsAdmin} />} />
        <Route path="/admin" element={<AdminDashboard user={user} />} />

        {/* User Routes */}
        {!user ? (
          <>
            <Route path="/" element={<SignInSignUp />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/upload" element={<UploadFiles user={user} />} />
            <Route
              path="/orders"
              element={isAdmin ? <AllOrders /> : <MyOrders user={user} />}
            />
            <Route path="/care" element={<CustomerCare />} />
            <Route path="/queue" element={<QueueStatus />} />
            <Route path="*" element={<Navigate to="/upload" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}