// src/components/NavBar.js
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../Firebase";
import { useNavigate } from "react-router-dom";

export default function NavBar({ user }) {
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isVendor = localStorage.getItem("isVendor") === "true";
  const vendorData = isVendor ? JSON.parse(localStorage.getItem("vendorData")) : null;

  console.log("🔍 NavBar Debug:", { isAdmin, isVendor, vendorData, user: user?.email });

  const handleLogout = () => {
    if (isVendor) {
      localStorage.removeItem("isVendor");
      localStorage.removeItem("vendorData");
      navigate("/vendor_login");
    } else if (isAdmin) {
      localStorage.removeItem("isAdmin");
      navigate("/admin_login");
    } else {
      signOut(auth);
      navigate("/");
    }
  };

  const getDisplayName = () => {
    if (isVendor && vendorData) {
      return vendorData.name;
    } else if (isAdmin) {
      return "Admin";
    } else if (user) {
      return user.displayName || user.email?.split("@")[0] || "User";
    }
    return "Guest";
  };

  const getInitial = () => {
    if (isVendor) return "V";
    if (isAdmin) return "A";
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const getAvatarColor = () => {
    if (isVendor) return { bg: "#e0f2fe", color: "#0369a1" }; // Blue for vendors
    if (isAdmin) return { bg: "#fef3c7", color: "#92400e" }; // Yellow for admin
    return { bg: "#eef2ff", color: "#1e3a8a" }; // Purple for users
  };

  const avatarStyle = getAvatarColor();

  return (
    <div className="navbar">
      <div className="nav-left">
        <div className="logo" onClick={() => {
          if (isVendor) navigate("/vendor/dashboard");
          else if (isAdmin) navigate("/admin");
          else navigate("/upload");
        }} style={{ cursor: 'pointer' }}>
          QuickPrint {isVendor ? "(Vendor)" : isAdmin ? "(Admin)" : ""}
        </div>
      </div>

      <div className="nav-actions">
        {/* Vendor Navigation */}
        {isVendor && (
          <>
            <a href="/vendor/dashboard" onClick={(e) => {
              e.preventDefault();
              navigate("/vendor/dashboard");
            }}>Vendor Dashboard</a>
          </>
        )}

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <a href="/admin" onClick={(e) => {
              e.preventDefault();
              navigate("/admin");
            }}>Admin Dashboard</a>
            <a href="/all-orders" onClick={(e) => {
              e.preventDefault();
              navigate("/all-orders");
            }}>All Orders</a>
            <a href="/queue" onClick={(e) => {
              e.preventDefault();
              navigate("/queue");
            }}>Queue Status</a>
          </>
        )}

        {/* Regular User Navigation */}
        {!isVendor && !isAdmin && user && (
          <>
            <a href="/upload" onClick={(e) => {
              e.preventDefault();
              navigate("/upload");
            }}>Upload Files</a>
            <a href="/orders" onClick={(e) => {
              e.preventDefault();
              navigate("/orders");
            }}>My Orders</a>
            <a href="/care" onClick={(e) => {
              e.preventDefault();
              navigate("/care");
            }}>Customer Care</a>
            <a href="/queue" onClick={(e) => {
              e.preventDefault();
              navigate("/queue");
            }}>Queue Status</a>
          </>
        )}

        {/* User Info & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "999px",
                background: avatarStyle.bg,
                color: avatarStyle.color,
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              {getInitial()}
            </div>
            <div style={{ fontSize: "14px", fontWeight: "500" }}>
              {getDisplayName()}
              {isVendor && <div style={{ fontSize: "12px", color: "#666" }}>Vendor</div>}
              {isAdmin && <div style={{ fontSize: "12px", color: "#666" }}>Administrator</div>}
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{ 
              padding: "8px 16px",
              fontSize: "14px"
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}