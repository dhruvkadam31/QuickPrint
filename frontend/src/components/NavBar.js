// src/components/NavBar.js
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../Firebase";
import { useNavigate, useLocation } from "react-router-dom";

export default function NavBar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const isVendor = localStorage.getItem("isVendor") === "true";
  const vendorData = isVendor ? JSON.parse(localStorage.getItem("vendorData") || "null") : null;

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
    if (isVendor && vendorData) return vendorData.name;
    if (isAdmin) return "Admin";
    if (user) return user.displayName || user.email?.split("@")[0] || "User";
    return "Guest";
  };

  const getInitial = () => {
    if (isVendor) return "V";
    if (isAdmin) return "A";
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const avatarColors = isVendor
    ? { bg: "#dbeafe", color: "#1d4ed8" }
    : isAdmin
    ? { bg: "#fef3c7", color: "#b45309" }
    : { bg: "#ede9fe", color: "#6d28d9" };

  const navLink = (href, label) => {
    const isActive = location.pathname === href;
    return (
      <a
        key={href}
        href={href}
        className={isActive ? "nav-active" : ""}
        onClick={(e) => { e.preventDefault(); navigate(href); }}
      >
        {label}
      </a>
    );
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="nav-left">
        <div
          className="logo"
          onClick={() => {
            if (isVendor) navigate("/vendor/dashboard");
            else if (isAdmin) navigate("/admin");
            else navigate("/upload");
          }}
        >
          ⚡ QuickPrint
          {isVendor && (
            <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginLeft: 6, WebkitTextFillColor: "#6b7280" }}>
              Vendor
            </span>
          )}
          {isAdmin && (
            <span style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginLeft: 6, WebkitTextFillColor: "#6b7280" }}>
              Admin
            </span>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="nav-actions">
        {isVendor && navLink("/vendor/dashboard", "Dashboard")}

        {isAdmin && (
          <>
            {navLink("/admin", "Dashboard")}
            {navLink("/all-orders", "All Orders")}
            {navLink("/queue", "Queue")}
          </>
        )}

        {!isVendor && !isAdmin && user && (
          <>
            {navLink("/upload", "🖨️ Print")}
            {navLink("/orders", "My Orders")}
            {navLink("/queue", "Queue")}
            {navLink("/care", "Support")}
          </>
        )}

        {/* Avatar + Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: avatarColors.bg,
                color: avatarColors.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {getInitial()}
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                {getDisplayName()}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {isVendor ? "Print Shop" : isAdmin ? "Administrator" : "Customer"}
              </div>
            </div>
          </div>

          <button
            id="nav-logout-btn"
            onClick={handleLogout}
            style={{
              padding: "7px 14px",
              border: "1.5px solid #e2e8f0",
              borderRadius: 8,
              background: "#f8fafc",
              color: "#475569",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.target.style.borderColor = "#ef4444"; e.target.style.color = "#ef4444"; e.target.style.background = "#fef2f2"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.color = "#475569"; e.target.style.background = "#f8fafc"; }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}