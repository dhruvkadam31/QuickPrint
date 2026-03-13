// src/pages/AllOrders.js
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AllOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get("http://localhost:5000/queue");
        setOrders(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="page-wrapper">
      <div className="card" style={{ maxWidth:1100, margin:"0 auto" }}>
        <h3>All Orders (Admin)</h3>
        <div className="orders-list">
          {orders.map((o) => (
            <div className="order-item" key={o.orderId}>
              <div className="space-between">
                <div>
                  <div style={{ fontWeight:700 }}>{o.serviceType} • {o.quantity} files</div>
                  <div className="small-muted">{o.userId}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:700 }}>₹{o.estimatedPrice}</div>
                  <div style={{ marginTop:6 }}>
                    <span style={{ padding:"6px 10px", borderRadius:999, background:"#eef2ff", color:"#1e3a8a" }}>
                      {o.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
