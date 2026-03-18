// src/components/NavBar.js
import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../Firebase";
import { useNavigate, useLocation } from "react-router-dom";

export default function NavBar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const [isAdmin, setIsAdmin]   = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [vendorData, setVendorData] = useState(null);

  useEffect(() => {
    const adminFlag  = localStorage.getItem("isAdmin")  === "true";
    const vendorFlag = localStorage.getItem("isVendor") === "true";
    const vendorRaw  = localStorage.getItem("vendorData");

    let parsedVendor = null;
    if (vendorFlag && vendorRaw) {
      try { parsedVendor = JSON.parse(vendorRaw); }
      catch {
        localStorage.removeItem("isVendor");
        localStorage.removeItem("vendorData");
      }
    }

    if (vendorFlag && !parsedVendor) {
      localStorage.removeItem("isVendor");
      localStorage.removeItem("vendorData");
      setIsVendor(false);
      setVendorData(null);
    } else {
      setIsVendor(vendorFlag);
      setVendorData(parsedVendor);
    }
    setIsAdmin(adminFlag);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (!e.target.closest(".navbar") && !e.target.closest(".nav-mobile-drawer")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const hasSession = isVendor || isAdmin || !!user;
  if (!hasSession) return null;

  const handleLogout = () => {
    setMenuOpen(false);
    if (isVendor) {
      localStorage.removeItem("isVendor");
      localStorage.removeItem("vendorData");
      setIsVendor(false);
      setVendorData(null);
      navigate("/vendor_login");
    } else if (isAdmin) {
      localStorage.removeItem("isAdmin");
      setIsAdmin(false);
      navigate("/admin_login");
    } else {
      signOut(auth);
      navigate("/");
    }
  };

  const goTo = (path) => { setMenuOpen(false); navigate(path); };

  const getDisplayName = () => {
    if (isVendor && vendorData) return vendorData.name;
    if (isAdmin) return "Admin";
    if (user) return user.displayName || user.email?.split("@")[0] || "User";
    return "Guest";
  };

  const getInitial = () => {
    if (isVendor && vendorData) return vendorData.name?.charAt(0).toUpperCase() || "V";
    if (isAdmin) return "A";
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const avatarColors = isVendor
    ? { bg: "#dbeafe", color: "#1d4ed8" }
    : isAdmin
    ? { bg: "#fef3c7", color: "#92400e" }
    : { bg: "#ede9fe", color: "#6d28d9" };

  const isActive = (path) => location.pathname === path;

  const navLinks = isVendor
    ? [{ path: "/vendor/dashboard", label: "Dashboard" }]
    : isAdmin
    ? [
        { path: "/admin",      label: "Dashboard" },
        { path: "/all-orders", label: "All Orders" },
        { path: "/queue",      label: "Queue Status" },
      ]
    : [
        { path: "/upload", label: "Upload Files" },
        { path: "/orders", label: "My Orders" },
        { path: "/care",   label: "Customer Care" },
        { path: "/queue",  label: "Queue Status" },
      ];

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <div className="nav-left">
          <div
            className="logo"
            onClick={() => goTo(isVendor ? "/vendor/dashboard" : isAdmin ? "/admin" : "/upload")}
          >
            QuickPrint
            {isVendor && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1d4ed8", background: "#dbeafe", padding: "2px 8px", borderRadius: 99, marginLeft: 6 }}>
                Vendor
              </span>
            )}
            {isAdmin && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fef3c7", padding: "2px 8px", borderRadius: 99, marginLeft: 6 }}>
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Desktop nav links */}
        <div className="nav-actions nav-desktop-links">
          {navLinks.map(({ path, label }) => (
            <a
              key={path}
              href={path}
              onClick={(e) => { e.preventDefault(); goTo(path); }}
              className={isActive(path) ? "active-link" : ""}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right side: user chip + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          {/* Desktop user chip */}
          <div className="nav-user-chip">
            <div
              className="nav-avatar"
              style={{ background: avatarColors.bg, color: avatarColors.color }}
            >
              {getInitial()}
            </div>
            <div>
              <div className="nav-user-name">{getDisplayName()}</div>
              <div className="nav-user-role">
                {isVendor ? "Vendor" : isAdmin ? "Administrator" : "Customer"}
              </div>
            </div>
            <button onClick={handleLogout} className="btn-logout" style={{ marginLeft: 4 }}>
              Logout
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            <span style={{ transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none", transition: "0.2s" }} />
            <span style={{ opacity: menuOpen ? 0 : 1, transition: "0.2s" }} />
            <span style={{ transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none", transition: "0.2s" }} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`nav-mobile-drawer ${menuOpen ? "open" : ""}`}>
        {navLinks.map(({ path, label }) => (
          <a
            key={path}
            href={path}
            onClick={(e) => { e.preventDefault(); goTo(path); }}
            style={
              isActive(path)
                ? { background: "var(--accent-light)", color: "var(--accent-text)", fontWeight: 700 }
                : {}
            }
          >
            {label}
          </a>
        ))}

        {/* User info + logout in drawer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            marginTop: 4,
            background: "var(--surface-2)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div
            style={{
              width: 34, height: 34, borderRadius: 999,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14,
              background: avatarColors.bg, color: avatarColors.color,
              flexShrink: 0,
            }}
          >
            {getInitial()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {getDisplayName()}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {isVendor ? "Vendor" : isAdmin ? "Administrator" : "Customer"}
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>
    </>
  );
}