"use client";

import { useState } from "react";
import type { Metric, PortalSection } from "../models/portal";
import { Icon } from "../components/Icon";
import { useGetUsersQuery } from "../api/usersApi";
import { useGetOrdersQuery } from "../../orders/api/ordersApi";
import { useGetRidersQuery } from "../../riders/api/ridersApi";
import { useGetStationsQuery } from "../../stations/api/stationsApi";
import { useGetRestaurantsQuery } from "../../restaurants/api/restaurantsApi";
import { useGetEmployeesQuery } from "../../employees/api/adminUsersApi";

type Props = { access: PortalSection[]; onNavigateManagement: () => void };

type DashboardCard = Metric & { section: PortalSection };

const NOT_CONNECTED = "Not connected yet";

const countValue = (loading: boolean, error: boolean, count: number | undefined) =>
  loading ? "…" : error ? "—" : String(count ?? 0);

const isPending = (status: unknown) => String(status).toLowerCase() === "pending";

export function DashboardView({ access, onNavigateManagement }: Props) {
  const has = (section: PortalSection) => access.includes(section);
  const [trendMode, setTrendMode] = useState<"revenue" | "orders">("revenue");

  const users = useGetUsersQuery({ page: 1, limit: 1 }, { skip: !has("users") });
  const employees = useGetEmployeesQuery({ page: 1, limit: 1 }, { skip: !has("employees") });
  const restaurants = useGetRestaurantsQuery(undefined, { skip: !has("restaurants") });
  const riders = useGetRidersQuery(undefined, { skip: !has("riders") });
  const orders = useGetOrdersQuery(undefined, { skip: !has("orders") });
  const stations = useGetStationsQuery(undefined, { skip: !has("stations") });

  const caption = (error: boolean, text: string) => (error ? "Unable to load" : text);

  // Headline totals only, each shown when this employee can open that section.
  const cards: DashboardCard[] = [
    { section: "users", label: "Users", value: countValue(users.isLoading, users.isError, users.data?.pagination.total), trend: caption(users.isError, "Registered customers"), icon: "users", tone: "orange" },
    { section: "employees", label: "Employees", value: countValue(employees.isLoading, employees.isError, employees.data?.total), trend: caption(employees.isError, "Staff accounts"), icon: "users", tone: "orange" },
    { section: "restaurants", label: "Restaurants", value: countValue(restaurants.isLoading, restaurants.isError, restaurants.data?.length), trend: caption(restaurants.isError, `${restaurants.data?.filter((r) => isPending(r.status)).length ?? 0} awaiting approval`), icon: "store", tone: "mint" },
    { section: "orders", label: "Orders", value: countValue(orders.isLoading, orders.isError, orders.data?.length), trend: caption(orders.isError, "Total orders"), icon: "bag", tone: "indigo" },
    { section: "stations", label: "Stations", value: countValue(stations.isLoading, stations.isError, stations.data?.length), trend: caption(stations.isError, "Configured stations"), icon: "station", tone: "mint" },
  ];
  const visibleCards = cards.filter((card) => has(card.section));

  const pendingRestaurants = restaurants.data?.filter((r) => isPending(r.status)).length ?? 0;
  const pendingRiders = riders.data?.filter((r) => isPending(r.status)).length ?? 0;
  const pendingApprovals = pendingRestaurants + pendingRiders;
  const canSeeApprovals = has("restaurants") || has("riders");

  return (
    <>
      <section className="metric-grid" aria-label="Platform snapshot">
        {visibleCards.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-top"><span className={`metric-icon tone-${metric.tone}`}><Icon name={metric.icon} size={18} /></span></div>
            <p>{metric.label}</p><h2>{metric.value}</h2><span className="metric-caption">{metric.trend}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-layout dashboard-layout--primary">
        <article className="panel sales-panel">
          <header className="panel-header"><div><h3>{has("orders") ? "Operational overview" : "Role overview"}</h3><p>Information is shown according to the sections this account can access.</p></div></header>
          <div className="trend-header"><div className="trend-switch" role="tablist" aria-label="Sales metric"><button type="button" role="tab" aria-selected={trendMode === "revenue"} className={trendMode === "revenue" ? "is-active" : ""} onClick={() => setTrendMode("revenue")}><i /> Revenue</button><button type="button" role="tab" aria-selected={trendMode === "orders"} className={trendMode === "orders" ? "is-active" : ""} onClick={() => setTrendMode("orders")}><i /> Orders</button></div><div className="trend-highlight"><strong>—</strong><span>{trendMode === "revenue" ? "gross sales" : "completed orders"}</span></div></div>
          <div className={`trend-chart trend-chart--${trendMode} trend-chart--empty`}>
            <svg viewBox="0 0 680 235" preserveAspectRatio="none" aria-hidden="true">
              {[48, 87, 126, 165, 204].map((y) => <line key={y} x1="46" x2="650" y1={y} y2={y} className="trend-grid-line" />)}
            </svg>
            <span className="trend-empty">{trendMode === "revenue" ? "Revenue" : "Order"} trend data is not connected yet.</span>
          </div>
        </article>

        <article className="panel health-panel">
          <header className="panel-header"><div><h3>Today at a glance</h3><p>Items that need an admin decision</p></div></header>
          <div className="health-list">
            <div className="health-row"><span>Orders completed</span><strong>—</strong><b /></div>
            <div className="health-row"><span>Pending approvals</span><strong>{canSeeApprovals ? pendingApprovals : "—"}</strong>{canSeeApprovals && pendingApprovals > 0 ? <b className="warning">Review</b> : <b />}</div>
            <div className="health-row"><span>Sales settled today</span><strong>—</strong><b /></div>
          </div>
          <button type="button" className="panel-link" onClick={onNavigateManagement}>Open management <Icon name="arrow-right" size={15} /></button>
        </article>
      </section>

      <section className="dashboard-layout dashboard-layout--secondary">
        <article className="panel activity-panel">
          <header className="panel-header"><div><h3>Recent activity</h3><p>Latest changes across your platform</p></div></header>
          <div className="api-state">No recent activity to show yet.</div>
        </article>
        <article className="panel attention-panel">
          <header className="panel-header"><div><h3>Needs attention</h3><p>A few things to clear today</p></div>{canSeeApprovals && <span className="attention-count">{pendingApprovals}</span>}</header>
          <div className="attention-list">
            {has("restaurants") && <div className="attention-row"><span className="attention-icon attention-icon--orange"><Icon name="store" size={16} /></span><div><strong>{pendingRestaurants} restaurant approvals</strong><p>Applications waiting for review</p></div>{pendingRestaurants > 0 && <button type="button" onClick={onNavigateManagement}>Review</button>}</div>}
            {has("riders") && <div className="attention-row"><span className="attention-icon attention-icon--indigo"><Icon name="rider" size={16} /></span><div><strong>{pendingRiders} rider approvals</strong><p>Verification waiting for review</p></div>{pendingRiders > 0 && <button type="button" onClick={onNavigateManagement}>Review</button>}</div>}
            <div className="attention-row"><span className="attention-icon attention-icon--mint"><Icon name="wallet" size={16} /></span><div><strong>Payment status</strong><p>{NOT_CONNECTED}</p></div></div>
          </div>
        </article>
      </section>
    </>
  );
}
