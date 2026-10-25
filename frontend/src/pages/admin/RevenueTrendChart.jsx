import { useState } from "react";
import { TrendingUpIcon, RupeeIcon, PackageIcon } from "./AdminIcons";

export default function RevenueTrendChart({ dailyTrends = [], monthlyTrends = [] }) {
  const [timeframe, setTimeframe] = useState("7d"); // "7d" or "30d"
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const activeData = timeframe === "7d" ? dailyTrends : monthlyTrends;
  const totalRevenueInPeriod = activeData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const totalOrdersInPeriod = activeData.reduce((acc, curr) => acc + (curr.orders || 0), 0);

  const maxRevenue = Math.max(...activeData.map((d) => d.revenue || 0), 0);
  const chartHeight = 170;
  const hasData = totalRevenueInPeriod > 0 || totalOrdersInPeriod > 0;

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <div>
          <h3 className="admin-card-title">
            <TrendingUpIcon size={20} color="var(--admin-brand-blue)" />
            Revenue &amp; Fulfillment Trends
          </h3>
          <p className="admin-card-subtitle">
            {timeframe === "7d" ? "Past 7 days" : "Past 30 days"} • Gross Volume: <strong>₹{totalRevenueInPeriod}</strong> across <strong>{totalOrdersInPeriod} orders</strong>
          </p>
        </div>

        <div className="admin-chart-timeframe-toggle">
          <button
            type="button"
            className={`admin-timeframe-btn ${timeframe === "7d" ? "active" : ""}`}
            onClick={() => {
              setTimeframe("7d");
              setHoveredPoint(null);
            }}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            className={`admin-timeframe-btn ${timeframe === "30d" ? "active" : ""}`}
            onClick={() => {
              setTimeframe("30d");
              setHoveredPoint(null);
            }}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      <div className="admin-chart-wrapper" onMouseLeave={() => setHoveredPoint(null)}>
        {/* Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="admin-chart-tooltip"
            style={{
              left: `${hoveredPoint.leftPercent}%`,
              top: `${hoveredPoint.topPx}px`,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: "#93c5fd" }}>
              {hoveredPoint.data.date}
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <div>
                <span style={{ color: "#94a3b8" }}>Revenue:</span>{" "}
                <strong style={{ color: "#ffffff" }}>₹{hoveredPoint.data.revenue || 0}</strong>
              </div>
              <div>
                <span style={{ color: "#94a3b8" }}>Orders:</span>{" "}
                <strong style={{ color: "#ffffff" }}>{hoveredPoint.data.orders || 0}</strong>
              </div>
            </div>
            {hoveredPoint.data.completed > 0 && (
              <div style={{ fontSize: "0.72rem", color: "#6ee7b7", marginTop: 2 }}>
                ✓ {hoveredPoint.data.completed} Picked up
              </div>
            )}
          </div>
        )}

        {/* Empty state if all values are zero */}
        {!hasData ? (
          <div className="admin-empty-state" style={{ padding: "40px 16px" }}>
            <div className="admin-empty-icon" style={{ background: "#f1f5f9", color: "#94a3b8" }}>
              <TrendingUpIcon size={24} />
            </div>
            <div className="admin-empty-title">No Revenue Recorded in This Timeframe</div>
            <p className="admin-empty-description">
              As students and campus staff submit print orders, daily revenue, volume spikes, and order fulfillment will populate this chart in real-time.
            </p>
          </div>
        ) : (
          <div style={{ position: "relative", height: chartHeight + 40, paddingTop: 10 }}>
            {/* Horizontal Gridlines */}
            <div style={{ position: "absolute", inset: "10px 0 30px 0", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
              <div style={{ borderBottom: "1px dashed #e2e8f0", height: 1, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", transform: "translateY(-12px)" }}>₹{maxRevenue}</span>
              </div>
              <div style={{ borderBottom: "1px dashed #e2e8f0", height: 1, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", transform: "translateY(-12px)" }}>₹{Math.round(maxRevenue / 2)}</span>
              </div>
              <div style={{ borderBottom: "1px solid #cbd5e1", height: 1, display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", transform: "translateY(-12px)" }}>₹0</span>
              </div>
            </div>

            {/* Bars Column Container */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                height: chartHeight,
                gap: timeframe === "7d" ? 16 : 4,
                padding: "0 10px",
                position: "relative",
                zIndex: 2,
              }}
            >
              {activeData.map((d, idx) => {
                const heightPercent = maxRevenue > 0
                  ? Math.max(6, Math.round(((d.revenue || 0) / maxRevenue) * 100))
                  : 6;
                const isHovered = hoveredPoint?.index === idx;

                return (
                  <div
                    key={idx}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = e.currentTarget.closest(".admin-chart-wrapper").getBoundingClientRect();
                      const leftPercent = ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width) * 100;
                      setHoveredPoint({
                        index: idx,
                        leftPercent,
                        topPx: 40,
                        data: d,
                      });
                    }}
                  >
                    {/* Amount Label for 7d view */}
                    {timeframe === "7d" && (
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          color: isHovered ? "var(--admin-brand-blue)" : "#475569",
                          marginBottom: 6,
                          transition: "color 0.15s ease",
                        }}
                      >
                        ₹{d.revenue || 0}
                      </span>
                    )}

                    {/* Bar */}
                    <div
                      className="admin-chart-bar"
                      style={{
                        width: timeframe === "7d" ? "65%" : "85%",
                        maxWidth: 44,
                        minHeight: 4,
                        height: `${heightPercent}%`,
                        background: isHovered
                          ? "linear-gradient(180deg, #2563eb 0%, #1e40af 100%)"
                          : (d.revenue > 0
                            ? "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)"
                            : "#e2e8f0"),
                        borderRadius: "4px 4px 0 0",
                        boxShadow: isHovered ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    />

                    {/* Date label */}
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: isHovered ? "var(--admin-text-main)" : "var(--admin-text-muted)",
                        fontWeight: isHovered ? 700 : 500,
                        marginTop: 8,
                        whiteSpace: "nowrap",
                        transform: timeframe === "30d" && idx % 3 !== 0 ? "scale(0)" : "scale(1)",
                        height: 16,
                      }}
                    >
                      {timeframe === "7d" ? d.date : (idx % 3 === 0 ? d.date : "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
