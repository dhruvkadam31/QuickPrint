// src/components/NavBar.js
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../Firebase";

export default function NavBar({ user }) {
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  return (
    <div className="navbar">
      <div className="nav-left">
        <div className="logo">QuickPrint</div>
      </div>

      <div className="nav-actions">
        {/* ✅ Conditional links based on admin */}
        {isAdmin ? (
  <>
    <a href="/queue">Queue Status</a>
    <a href="/orders">All Orders</a>
  </>
) : (
  <>
    <a href="/upload">Upload Files</a>
     <a href="/orders">My Orders</a> 
<a href="/care">Customer Care</a>  {/* ✅ match App.js route */}
  </>
)}


        <div style={{ width: 12 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "#eef2ff",
              color: "#1e3a8a",
              fontWeight: 700,
            }}
          >
            {user?.email?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div style={{ marginRight: 8 }}>{user?.email?.split("@")[0]}</div>
        </div>
        <button
          onClick={() => signOut(auth)}
          style={{ marginLeft: 8 }}
          className="btn-ghost"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
