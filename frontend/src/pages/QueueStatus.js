// QueueStatus.js
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function QueueStatus() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const fetchQueue = async () => {
      const res = await axios.get("http://localhost:5000/queue");
      setQueue(res.data);
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-wrapper">
      <div className="card">
        <h3>Live Queue Status</h3>
        <p className="small-muted">Real-time updates on print queue and order status</p>
        <div style={{ marginTop: 16 }}>
          {queue.map((o, idx) => (
            <div key={o.id} className="order-item">
              <div className="space-between">
                <div>
                  <b>#{o.id}</b> {o.status}
                  <div className="small-muted">{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div>Position: {idx + 1}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
