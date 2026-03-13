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

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Firebase user auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  if (!authChecked) return null;

  const isAdmin = localStorage.getItem("isAdmin") === "true";

  return (
    <Router>
      {/* Show user navbar only if logged in and not admin */}
      {user && !isAdmin && <NavBar user={user} />}
      
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin_login" element={<AdminLogin />} />
        <Route path="/admin" element={ <AdminDashboard /> } />

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