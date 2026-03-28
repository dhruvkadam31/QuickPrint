import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './VendorNavbar.css';

const VendorNavbar = () => {
const vendor = JSON.parse(localStorage.getItem("vendorData"));
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isVendor = localStorage.getItem("isVendor") === "true";

  const handleLogout = async () => {
  if (isVendor) {
    try {
      const vendor = JSON.parse(localStorage.getItem("vendorData"));
      console.log(vendorId);
      await fetch(`http://localhost:5000/vendor/${vendor.vendorId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnline: false })
      });

    } catch (err) {
      console.error("Logout error:", err);
    }

    localStorage.removeItem("isVendor");
    localStorage.removeItem("vendorData");
    navigate("/vendor_login");

  } else if (isAdmin) {
    localStorage.removeItem("isAdmin");
    navigate("/admin_login");

  } else {
    await signOut(auth);
    navigate("/");
  }
};

  const navItems = [
    { path: '/vendor/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/vendor/orders', label: 'Orders', icon: '📋' },
    { path: '/vendor/queue', label: 'Queue', icon: '🔄' },
    { path: '/vendor/revenue', label: 'Revenue', icon: '💰' },
    { path: '/vendor/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="vendor-navbar">
      <div className="nav-container">
        {/* Logo */}
        <div className="nav-logo">
          <Link to="/vendor/dashboard">
            <span className="logo-icon">🖨️</span>
            <span className="logo-text">QuickPrint Vendor</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-menu">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Vendor Profile */}
        <div className="nav-profile">
          <div 
            className="profile-trigger"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="vendor-avatar">
              {vendor?.name?.charAt(0) || 'V'}
            </div>
            <div className="vendor-info">
              <span className="vendor-name">{vendor?.name || 'Vendor'}</span>
              <span className="vendor-id">{vendor?.vendorId || ''}</span>
            </div>
            <span className="dropdown-icon">▼</span>
          </div>

          {showProfileMenu && (
            <div className="profile-menu">
              <div className="profile-header">
                <div className="header-avatar">
                  {vendor?.name?.charAt(0) || 'V'}
                </div>
                <div className="header-info">
                  <div className="header-name">{vendor?.name}</div>
                  <div className="header-email">{vendor?.email}</div>
                </div>
              </div>
              <div className="menu-items">
                <Link to="/vendor/settings" className="menu-item">
                  <span className="menu-icon">⚙️</span>
                  <span>Settings</span>
                </Link>
                <button onClick={handleLogout} className="menu-item logout">
                  <span className="menu-icon">🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="mobile-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
          <button onClick={handleLogout} className="mobile-nav-item logout">
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default VendorNavbar;