// MyOrders.js
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MyOrders({ user }) {
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const res = await axios.get(`http://localhost:5000/orders/${user.uid}`);
      setOrders(res.data);
    };
    fetchOrders();
  }, [user]);

  const filtered =
    tab === "active"
      ? orders.filter((o) => o.status !== "Completed")
      : tab === "completed"
      ? orders.filter((o) => o.status === "Completed")
      : orders;

  return (
    <div className="page-wrapper">
      <div className="card">
        <h3>My Orders</h3>
        <div className="tabs">
          <button onClick={() => setTab("active")}>Active ({orders.filter(o=>o.status!=="Completed").length})</button>
          <button onClick={() => setTab("completed")}>Completed ({orders.filter(o=>o.status==="Completed").length})</button>
          <button onClick={() => setTab("all")}>All ({orders.length})</button>
        </div>

        <div style={{ marginTop: 16 }}>
          {filtered.map((o) => (
            <div key={o.id} className="order-item">
              <div className="space-between">
                <div>
                  {o.serviceType} • {o.quantity} files
                  <div className="small-muted">{new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  ₹{o.estimatedPrice}{" "}
                  <span className="status">{o.status}</span>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="small-muted">No orders yet.</div>}
        </div>
      </div>
    </div>
  );
}
