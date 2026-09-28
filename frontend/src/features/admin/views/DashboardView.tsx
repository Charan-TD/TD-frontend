"use client";

import type { Activity, Metric, PortalSection } from "../models/portal";
import { useDashboardViewModel } from "../viewmodels/dashboardViewModel";
import { Icon } from "../components/Icon";
import { useGetOrdersQuery } from "../../orders/api/ordersApi";
import { useGetRidersQuery } from "../../riders/api/ridersApi";
import { useGetStationsQuery } from "../../stations/api/stationsApi";

type Props = { metrics: Metric[]; activities: Activity[]; access: PortalSection[]; onNavigateManagement: () => void };

export function DashboardView({ metrics, activities, access, onNavigateManagement }: Props) {
  const vm = useDashboardViewModel(metrics, activities, onNavigateManagement);
  const { data: orders, isLoading: ordersLoading, isError: ordersError } = useGetOrdersQuery();
  const { data: riders, isLoading: ridersLoading, isError: ridersError } = useGetRidersQuery();
  const { data: stations, isLoading: stationsLoading, isError: stationsError } = useGetStationsQuery();
  const { trendData, trendMode, setTrendMode, selectedPoint, setSelectedPoint, selected, pointString, areaPath } = vm;
  const visibleMetrics = access.includes("users") && access.includes("riders") && access.includes("restaurants") && access.includes("orders")
    ? metrics
    : access.filter((item) => item !== "dashboard").map((item) => ({
        users: { label: "Users", value: "12,840", trend: "Live operations", icon: "users" as const, tone: "orange" as const },
        riders: { label: "Riders", value: "286", trend: "18 awaiting review", icon: "users" as const, tone: "mint" as const },
        restaurants: { label: "Restaurants", value: "48", trend: "5 awaiting approval", icon: "store" as const, tone: "mint" as const },
        orders: { label: "Orders today", value: "1,248", trend: "Active operations", icon: "bag" as const, tone: "indigo" as const },
        sales: { label: "Sales", value: "₹18.6L", trend: "+16.2% this month", icon: "wallet" as const, tone: "violet" as const },
        marketing: { label: "Marketing", value: "3 live", trend: "Offers & campaigns", icon: "megaphone" as const, tone: "violet" as const },
        reports: { label: "Reports", value: "—", trend: "Coming soon", icon: "chart" as const, tone: "indigo" as const },
        employees: { label: "Employees", value: "24", trend: "Access managed by admin", icon: "users" as const, tone: "orange" as const },
        stations: { label: "Stations", value: "14", trend: "All operational", icon: "station" as const, tone: "mint" as const },
      }[item])).filter(Boolean) as Metric[];
  const liveMetrics: Metric[] = [
    { label: "Orders", value: ordersLoading ? "…" : ordersError ? "—" : String(orders?.length ?? 0), trend: ordersError ? "API unavailable" : "Live from orders", icon: "bag", tone: "indigo" },
    { label: "Riders", value: ridersLoading ? "…" : ridersError ? "—" : String(riders?.length ?? 0), trend: ridersError ? "API unavailable" : "Live from riders", icon: "users", tone: "mint" },
    { label: "Stations", value: stationsLoading ? "…" : stationsError ? "—" : String(stations?.length ?? 0), trend: stationsError ? "API unavailable" : "Live from stations", icon: "station", tone: "orange" },
  ];
  const dashboardMetrics = [visibleMetrics.find((metric) => metric.label === "Users") ?? visibleMetrics[0], ...liveMetrics];

  return (
    <>
      <section className="metric-grid" aria-label="Platform snapshot">
        {dashboardMetrics.map((metric) => <article className="metric-card" key={metric.label}>
          <div className="metric-top"><span className={`metric-icon tone-${metric.tone}`}><Icon name={metric.icon} size={18} /></span><span className="metric-trend">↗ {metric.trend.split(" ")[0]}</span></div>
          <p>{metric.label}</p><h2>{metric.value}</h2><span className="metric-caption">{metric.trend}</span>
        </article>)}
      </section>

      <section className="dashboard-layout dashboard-layout--primary">
        <article className="panel sales-panel">
          <header className="panel-header"><div><h3>{access.includes("orders") ? "Operational overview" : "Role overview"}</h3><p>Information is shown according to the sections this account can access.</p></div><button type="button" className="select-button"><Icon name="calendar" size={14} /> Last 6 months <Icon name="chevron-down" size={13} /></button></header>
          <div className="trend-header"><div className="trend-switch" role="tablist" aria-label="Sales metric"><button type="button" role="tab" aria-selected={trendMode === "revenue"} className={trendMode === "revenue" ? "is-active" : ""} onClick={() => setTrendMode("revenue")}><i /> Revenue</button><button type="button" role="tab" aria-selected={trendMode === "orders"} className={trendMode === "orders" ? "is-active" : ""} onClick={() => setTrendMode("orders")}><i /> Orders</button></div><div className="trend-highlight"><strong>{trendMode === "revenue" ? selected.revenue : selected.orders}</strong><span>{selected.month} · {trendMode === "revenue" ? "gross sales" : "completed orders"}</span></div></div>
          <div className={`trend-chart trend-chart--${trendMode}`} role="img" aria-label={`${trendMode} trend from April to September`}>
            <svg viewBox="0 0 680 235" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".24"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs>
              {[48, 87, 126, 165, 204].map((y) => <line key={y} x1="46" x2="650" y1={y} y2={y} className="trend-grid-line" />)}
              <path d={areaPath} className="trend-area" />
              <polyline points={pointString} className="trend-line" />
              {trendData.map((point, index) => <g key={point.month} className={`trend-point ${index === selectedPoint ? "is-selected" : ""}`} onMouseEnter={() => setSelectedPoint(index)} onFocus={() => setSelectedPoint(index)}><circle cx={point.x} cy={point[`${trendMode}Y`]} r="12" className="trend-hit" tabIndex={0} /><circle cx={point.x} cy={point[`${trendMode}Y`]} r="4" className="trend-dot" />{index === selectedPoint && <text x={point.x} y={point[`${trendMode}Y`] - 15} textAnchor="middle">{trendMode === "revenue" ? point.revenue : point.orders}</text>}<text x={point.x} y="225" textAnchor="middle" className="trend-month">{point.month}</text></g>)}
            </svg>
          </div>
          <div className="trend-summary"><span><i /> Hover a point to inspect a month</span><span>{trendMode === "revenue" ? "₹82.4L total" : "6,316 completed orders"} <b>↗ 16.2%</b></span></div>
        </article>

        <article className="panel health-panel">
          <header className="panel-header"><div><h3>Today at a glance</h3><p>Items that need an admin decision</p></div></header>
          <div className="health-list">
            <div className="health-row"><span>Orders completed</span><strong>1,248</strong><b className="positive">98.2%</b></div>
            <div className="health-row"><span>Pending approvals</span><strong>12</strong><b className="warning">Review</b></div>
            <div className="health-row"><span>Sales settled today</span><strong>₹48,920</strong><b className="positive">On time</b></div>
          </div>
          <button type="button" className="panel-link" onClick={onNavigateManagement}>Open management <Icon name="arrow-right" size={15} /></button>
        </article>
      </section>

      <section className="dashboard-layout dashboard-layout--secondary">
        <article className="panel activity-panel">
          <header className="panel-header"><div><h3>Recent activity</h3><p>Latest changes across your platform</p></div><button type="button" className="text-button">View all</button></header>
          <div className="activity-list">{activities.map((item) => <div className="activity-row" key={item.title}><span className={`activity-avatar tone-${item.tone}`}>{item.initials}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time></div>)}</div>
        </article>
        <article className="panel attention-panel">
          <header className="panel-header"><div><h3>Needs attention</h3><p>A few things to clear today</p></div><span className="attention-count">12</span></header>
          <div className="attention-list">
            <div className="attention-row"><span className="attention-icon attention-icon--orange"><Icon name="store" size={16} /></span><div><strong>5 kitchen approvals</strong><p>Applications are ready to review</p></div><button type="button">Review</button></div>
            <div className="attention-row"><span className="attention-icon attention-icon--indigo"><Icon name="rider" size={16} /></span><div><strong>7 rider documents</strong><p>Verification is waiting</p></div><button type="button">Review</button></div>
            <div className="attention-row attention-row--done"><span className="attention-icon attention-icon--mint"><Icon name="check" size={16} /></span><div><strong>Payment status</strong><p>All settlements are up to date</p></div><span className="done-label">Clear</span></div>
          </div>
        </article>
      </section>
    </>
  );
}
