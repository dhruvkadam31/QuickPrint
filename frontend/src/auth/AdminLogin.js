import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin({ setIsAdmin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (password === "admin123") {
       // Update state in App.js
      // mark admin session
      localStorage.setItem("isAdmin", "true");
      navigate("/admin"); // go to admin dashboard
    } else {
      setError("Wrong password!");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Admin Login</h1>
      <input
        type="password"
        placeholder="Enter Admin Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ padding: 8, marginTop: 12, width: 200 }}
      />
      <br /><br />
      <button onClick={handleLogin} style={{ padding: "8px 16px" }}>Login</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}