"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PortalSection } from "../models/portal";
import { Icon } from "../components/Icon";
import { ChartRangeSelect } from "../components/ChartRangeSelect";
import { useGetUsersQuery } from "../api/usersApi";
import { useGetAllOrdersQuery, type Order } from "../../orders/api/ordersApi";
import { useGetRidersQuery } from "../../riders/api/ridersApi";
import { useGetStationsQuery } from "../../stations/api/stationsApi";
import { useGetRestaurantsQuery } from "../../restaurants/api/restaurantsApi";
import { useGetRegistrationRequestsQuery } from "../../restaurants/api/registrationRequestsApi";
import { useGetProfileEditRequestsQuery } from "../../restaurants/api/profileEditRequestsApi";
import { useGetEmployeesQuery } from "../../employees/api/adminUsersApi";

type Props = { access: PortalSection[]; onOpenSection: (section: PortalSection, subsectionId?: string) => void };

type IconName = Parameters<typeof Icon>[0]["name"];
type SummaryCard = { section: PortalSection; label: string; value: string; caption: string; icon: IconName; badge?: number };

type ActivityItem = { id: string; section: PortalSection; icon: IconName; at: string; title: string; detail: string };

const NOT_CONNECTED = "Not connected yet";

const countValue = (loading: boolean, error: boolean, count: number | undefined) =>
  loading ? "…" : error ? "-" : String(count ?? 0);

const isPending = (status: unknown) => String(status).toLowerCase() === "pending";

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const dayLabel = (date: Date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const activityTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const now = new Date();
  if (dayKey(date) === dayKey(now)) {
    const elapsedHours = Math.max(1, Math.floor(Math.max(0, now.getTime() - date.getTime()) / 3_600_000));
    return `${elapsedHours} ${elapsedHours === 1 ? "hr" : "hrs"} ago`;
  }
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};
const rupees = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const compact = (value: number) => (value >= 100000 ? `${+(value / 100000).toFixed(1)}L` : value >= 1000 ? `${+(value / 1000).toFixed(1)}k` : String(value));

/** Round the chart ceiling up to a tidy number so the four grid steps read cleanly. */
const niceMax = (max: number) => {
  if (max <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max / 4));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude * 4 >= max) ?? 10;
  return step * magnitude * 4;
};

export type DayPoint = { key: string; label: string; full: string; orders: number; revenue: number };

type Range = "7d" | "30d" | "6m";

const RANGES: { id: Range; label: string; phrase: string; unit: string }[] = [
  { id: "7d", label: "7 days", phrase: "the last 7 days", unit: "day" },
  { id: "30d", label: "30 days", phrase: "the last 30 days", unit: "day" },
  { id: "6m", label: "6 months", phrase: "the last 6 months", unit: "month" },
];

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}`;

/** Orders and sales per day (7 / 30 days) or per month (6 months), oldest first. */
function buildPoints(orders: Order[], range: Range): DayPoint[] {
  const points: DayPoint[] = [];
  const today = new Date();
  const monthly = range === "6m";
  const count = range === "7d" ? 7 : range === "30d" ? 30 : 6;

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    if (monthly) {
      const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      points.push({ key: monthKey(date), label: date.toLocaleDateString("en-IN", { month: "short" }), full: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), orders: 0, revenue: 0 });
    } else {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      points.push({ key: dayKey(date), label: dayLabel(date), full: dayLabel(date), orders: 0, revenue: 0 });
    }
  }

  const byKey = new Map(points.map((point) => [point.key, point]));
  orders.forEach((order) => {
    if (!order.created_at) return;
    const created = new Date(order.created_at);
    if (Number.isNaN(created.getTime())) return;
    const point = byKey.get(monthly ? monthKey(created) : dayKey(created));
    if (!point) return;
    point.orders += 1;
    point.revenue += Number(order.total) || 0;
  });
  return points;
}


const PAD_L = 46, PAD_R = 16, PAD_T = 30, PAD_B = 34;

/**
 * Revenue is drawn as bars, orders as a line. Hovering a day shows the other
 * measure for it: orders on the revenue chart, revenue on the orders chart.
 */
export function TrendChart({ days, mode, onActivate, barChart = false, subject = "orders" }: { days: DayPoint[]; mode: "revenue" | "orders"; onActivate?: () => void; barChart?: boolean; subject?: "orders" | "payments" }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 640, h: 280 });
  // Draw at the real pixel size of the card so the chart fills it and text is never stretched.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: Math.max(320, Math.round(el.clientWidth)), h: Math.max(180, Math.round(el.clientHeight)) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const W = size.w, H = size.h;
  const values = days.map((day) => (mode === "revenue" ? day.revenue : day.orders));
  const top = niceMax(Math.max(...values, 0));
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
  const slot = plotW / days.length;
  const x = (i: number) => PAD_L + slot * i + slot / 2;
  const y = (v: number) => PAD_T + plotH - (v / top) * plotH;
  const grid = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);

  // Each bar is compared with the period average: at or above is green, below is red.
  const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
  const level = (value: number) => (average <= 0 ? "flat" : value >= average ? "high" : "low");
  const active = hover === null ? null : days[hover];
  const labelStep = Math.ceil(days.length / 8);
  const showLabel = (i: number) => i % labelStep === 0 || i === days.length - 1;
  const tipW = 132, tipH = 50;
  const tipX = hover === null ? 0 : Math.min(Math.max(x(hover) - tipW / 2, PAD_L), W - PAD_R - tipW);
  const anchorY = hover === null ? 0 : y(values[hover]);
  const tipY = anchorY - tipH - 12 < 0 ? anchorY + 14 : anchorY - tipH - 12;

  return (
    <div className={`dash-chart-wrap${onActivate ? " dash-chart-wrap--link" : ""}`} ref={wrapRef} role={onActivate ? "link" : undefined} tabIndex={onActivate ? 0 : undefined} aria-label={onActivate ? `Open ${mode === "revenue" ? "payments and transactions" : "orders"}` : undefined} onClick={onActivate} onKeyDown={(event) => { if (onActivate && event.key === "Enter") { event.preventDefault(); onActivate(); } }}>
    <svg className="dash-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${mode === "revenue" ? subject === "payments" ? "Payment amount" : "Revenue" : subject === "payments" ? "Payment count" : "Orders"}, ${mode === "revenue" || barChart ? "bar" : "line"} chart`} onMouseLeave={() => setHover(null)}>
      {grid.map((g) => (
        <g key={g}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(g)} y2={y(g)} className="dash-chart-grid" />
          <text x={PAD_L - 8} y={y(g) + 3} textAnchor="end" className="dash-chart-axis">{mode === "revenue" ? compact(g) : g}</text>
        </g>
      ))}
      {mode === "revenue" || barChart ? days.map((day, i) => {
        const barW = Math.min(38, Math.max(3, slot * 0.6));
        const value = mode === "revenue" ? day.revenue : day.orders;
        const h = (value / top) * plotH;
        return (
          <g key={day.key}>
            <rect x={x(i) - barW / 2} y={PAD_T + plotH - h} width={barW} height={Math.max(h, value > 0 ? 2 : 0)} rx="4" className={`dash-chart-bar dash-chart-bar--${level(value)}${hover === i ? " is-hover" : ""}`} />
            {showLabel(i) && <text x={x(i)} y={H - 12} textAnchor="middle" className="dash-chart-date">{day.label}</text>}
          </g>
        );
      }) : (
        <>
          <polyline className="dash-chart-line" points={days.map((day, i) => `${x(i)},${y(day.orders)}`).join(" ")} />
          {days.map((day, i) => (
            <g key={day.key}>
              <circle cx={x(i)} cy={y(day.orders)} r={hover === i ? 6 : days.length > 12 ? 3 : 4} className={`dash-chart-dot dash-chart-dot--${level(day.orders)}`} />
              {showLabel(i) && <text x={x(i)} y={H - 12} textAnchor="middle" className="dash-chart-date">{day.label}</text>}
            </g>
          ))}
        </>
      )}
      {average > 0 && (() => {
        // Drawn after the bars so they never cover it; the pill keeps the label readable over any bar.
        const text = `Average ${mode === "revenue" ? rupees(Math.round(average)) : average.toFixed(1)}`;
        const pillW = text.length * 6.4 + 16, pillH = 20;
        const pillY = Math.max(PAD_T - 4, y(average) - pillH - 4);
        return <g pointerEvents="none">
          <line x1={PAD_L} x2={W - PAD_R} y1={y(average)} y2={y(average)} className="dash-chart-avg-halo" />
          <line x1={PAD_L} x2={W - PAD_R} y1={y(average)} y2={y(average)} className="dash-chart-avg" />
          <rect x={PAD_L + 6} y={pillY} width={pillW} height={pillH} rx="10" className="dash-chart-avg-pill" />
          <text x={PAD_L + 6 + pillW / 2} y={pillY + 14} textAnchor="middle" className="dash-chart-avg-label">{text}</text>
        </g>;
      })()}
      {days.map((day, i) => (
        <rect key={`hit-${day.key}`} x={PAD_L + slot * i} y={PAD_T - 8} width={slot} height={plotH + 8} className="dash-chart-hit" tabIndex={0} aria-label={`${day.full}: ${rupees(day.revenue)}, ${day.orders} ${subject}`}
          onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />
      ))}
      {active && (
        <g className="dash-chart-tip" pointerEvents="none">
          <rect x={tipX} y={tipY} width={tipW} height={tipH + 16} rx="8" />
          <text x={tipX + 10} y={tipY + 17} className="dash-chart-tip-date">{active.full}</text>
          <text x={tipX + 10} y={tipY + 38} className="dash-chart-tip-value">
            {mode === "revenue" ? `${active.orders} ${active.orders === 1 ? subject.slice(0, -1) : subject}` : `${rupees(active.revenue)} ${subject === "payments" ? "paid" : "revenue"}`}
          </text>
          {level(values[hover as number]) !== "flat" && (
            <text x={tipX + 10} y={tipY + 58} className={`dash-chart-tip-level dash-chart-tip-level--${level(values[hover as number])}`}>{level(values[hover as number]) === "high" ? "Above average" : "Below average"}</text>
          )}
        </g>
      )}
    </svg>
    </div>
  );
}

export function DashboardView({ access, onOpenSection }: Props) {
  const has = (section: PortalSection) => access.includes(section);
  const [trendMode, setTrendMode] = useState<"revenue" | "orders">("revenue");
  const [range, setRange] = useState<Range>("7d");
  const rangeInfo = RANGES.find((item) => item.id === range) ?? RANGES[0];

  const users = useGetUsersQuery({ page: 1, limit: 1 }, { skip: !has("users") });
  const employees = useGetEmployeesQuery({ page: 1, limit: 1 }, { skip: !has("employees") });
  const restaurants = useGetRestaurantsQuery(undefined, { skip: !has("restaurants") });
  const pendingRegistrations = useGetRegistrationRequestsQuery("pending", { skip: !has("restaurants") });
  const pendingProfileEdits = useGetProfileEditRequestsQuery("pending", { skip: !has("restaurants") });
  const pendingRestaurants = (pendingRegistrations.data?.length ?? 0) + (pendingProfileEdits.data?.length ?? 0);
  const riders = useGetRidersQuery(undefined, { skip: !has("riders") });
  const orders = useGetAllOrdersQuery(undefined, { skip: !has("orders") });
  const stations = useGetStationsQuery(undefined, { skip: !has("stations") });

  const caption = (error: boolean, text: string) => (error ? "Unable to load" : text);

  // Two grouped cards. Each stat inside opens its own section when tapped.
  const stat = (section: PortalSection, label: string, value: string, caption: string, icon: IconName, badge?: number): SummaryCard => ({ section, label, value, caption, icon, badge });
  const groups: { title: string; stats: SummaryCard[] }[] = [
    {
      title: "People",
      stats: [
        stat("employees", "Employees", countValue(employees.isLoading, employees.isError, employees.data?.total), caption(employees.isError, "Staff accounts"), "employee"),
        stat("users", "Users", countValue(users.isLoading, users.isError, users.data?.pagination.total), caption(users.isError, "Registered customers"), "users"),
      ],
    },
    {
      title: "Restaurants & stations",
      stats: [
        stat("restaurants", "Restaurants", countValue(restaurants.isLoading, restaurants.isError, restaurants.data?.length), caption(restaurants.isError, "awaiting approval"), "store", restaurants.isError ? undefined : pendingRestaurants),
        stat("stations", "Stations", countValue(stations.isLoading, stations.isError, stations.data?.length), caption(stations.isError, "Configured stations"), "station"),
      ],
    },
  ].map((group) => ({ ...group, stats: group.stats.filter((item) => has(item.section)) })).filter((group) => group.stats.length > 0);

  const pendingRiders = riders.data?.filter((r) => isPending(r.status)).length ?? 0;
  const pendingApprovals = pendingRestaurants + pendingRiders;
  const canSeeApprovals = has("restaurants") || has("riders");

  const days = useMemo(() => buildPoints(orders.data ?? [], range), [orders.data, range]);
  const lastPoint = days[days.length - 1];
  // Activity feed built from what the API exposes: new orders and restaurant requests.
  const activity = useMemo(() => {
    const items: ActivityItem[] = [];
    (orders.data ?? []).forEach((order, index) => {
      if (!order.created_at) return;
      items.push({
        id: `order-${order.id ?? order.order_number ?? index}-${index}`, section: "orders", icon: "receipt", at: order.created_at,
        title: `New order${order.order_number ? ` #${order.order_number}` : ""}${order.restaurant_name ? ` · ${order.restaurant_name}` : ""}`,
        detail: [order.total != null && order.total !== "" ? rupees(Number(order.total) || 0) : null, order.delivery_station_name, order.status_label || order.status].filter(Boolean).join(" · "),
      });
    });
    (pendingRegistrations.data ?? []).forEach((request) => {
      if (!request.createdAt) return;
      items.push({ id: `registration-${request.requestId}`, section: "restaurants", icon: "store", at: request.createdAt, title: `Restaurant registration · ${request.restaurantName}`, detail: `Awaiting approval${request.ownerName ? ` · ${request.ownerName}` : ""}` });
    });
    (pendingProfileEdits.data ?? []).forEach((request) => {
      if (!request.createdAt) return;
      items.push({ id: `edit-${request.id}`, section: "restaurants", icon: "edit", at: request.createdAt, title: "Restaurant profile edit request", detail: `${Object.keys(request.requestedChanges).length} field(s) awaiting review` });
    });
    return items.filter((item) => !Number.isNaN(Date.parse(item.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 40);
  }, [orders.data, pendingRegistrations.data, pendingProfileEdits.data]);
  const metricOf = (day: DayPoint) => (trendMode === "revenue" ? day.revenue : day.orders);
  const bestDay = days.reduce<DayPoint | null>((best, day) => (!best || metricOf(day) > metricOf(best) ? day : best), null);
  const bestValue = bestDay ? metricOf(bestDay) : 0;
  const otherTotal = days.reduce((sum, day) => sum + (trendMode === "revenue" ? day.orders : day.revenue), 0);
  const periodTotal = days.reduce((sum, day) => sum + (trendMode === "revenue" ? day.revenue : day.orders), 0);

  return (
    <>
      {groups.length > 0 && (
        <section className="dash-cards" aria-label="Platform snapshot">
          {groups.map((group) => (
            <article className="dash-group" key={group.title} aria-label={group.title}>
              {group.stats.map((item) => (
                <button type="button" className="dash-stat" data-tone={item.section} key={item.section} onClick={() => onOpenSection(item.section)} aria-label={`Open ${item.label}`}>
                  <span className="dash-card-icon"><Icon name={item.icon} size={20} /></span>
                  <span className="dash-stat-text">
                    <b>{item.label}</b>
                    <span className="dash-stat-caption">{item.badge !== undefined && <i className="dash-badge"><u />{item.badge}</i>}{item.caption}</span>
                  </span>
                  <strong className="dash-stat-value">{item.value}</strong>
                  <span className="dash-stat-chevron"><Icon name="chevron-down" size={16} /></span>
                </button>
              ))}
            </article>
          ))}
        </section>
      )}

      <section className="dash-grid">
        <article className="panel dash-panel dash-trend">
          <header className="panel-header"><div><h3>{trendMode === "revenue" ? "Revenue" : "Orders"}</h3><p>{rangeInfo.label[0].toUpperCase() + rangeInfo.label.slice(1)} · {days[0].label} – {lastPoint.label}</p></div>
            <div className="trend-controls">
            <ChartRangeSelect value={range} onChange={setRange} />
            <div className="trend-switch" role="tablist" aria-label="Chart metric">
              <button type="button" role="tab" aria-selected={trendMode === "revenue"} className={trendMode === "revenue" ? "is-active" : ""} onClick={() => setTrendMode("revenue")}>Revenue</button>
              <button type="button" role="tab" aria-selected={trendMode === "orders"} className={trendMode === "orders" ? "is-active" : ""} onClick={() => setTrendMode("orders")}>Orders</button>
            </div>
            </div>
          </header>
          {!has("orders") ? (
            <div className="api-state">Order data is not available for this account.</div>
          ) : orders.isLoading ? (
            <div className="api-state">Loading chart…</div>
          ) : orders.isError ? (
            <div className="api-state api-state--error">Unable to load order data.</div>
          ) : (
            <>
              <div className="dash-trend-total"><strong>{trendMode === "revenue" ? rupees(periodTotal) : periodTotal}</strong><span>{trendMode === "revenue" ? "gross sales" : "orders"} in {rangeInfo.phrase}</span>
                <span className="dash-trend-legend" aria-label="Colour key"><i className="is-high" />At or above average<i className="is-low" />Below average</span>
              </div>
              <div className="dash-trend-stats">
                <div><span>Best {rangeInfo.unit}</span><strong>{bestDay && bestValue > 0 ? bestDay.full : "-"}</strong><small>{bestValue > 0 ? (trendMode === "revenue" ? rupees(bestValue) : `${bestValue} orders`) : "No sales yet"}</small></div>
                <div><span>{rangeInfo.unit === "day" ? "Daily" : "Monthly"} average</span><strong>{trendMode === "revenue" ? rupees(Math.round(periodTotal / days.length)) : (periodTotal / days.length).toFixed(1)}</strong><small>{trendMode === "revenue" ? `per ${rangeInfo.unit}` : `orders per ${rangeInfo.unit}`}</small></div>
                <div><span>{trendMode === "revenue" ? "Orders" : "Revenue"}</span><strong>{trendMode === "revenue" ? otherTotal : rupees(otherTotal)}</strong><small>in {rangeInfo.phrase}</small></div>
              </div>
              <TrendChart days={days} mode={trendMode} onActivate={(trendMode === "revenue" ? has("sales") : has("orders")) ? () => onOpenSection(trendMode === "revenue" ? "sales" : "orders", trendMode === "revenue" ? "sales-all" : "orders-all") : undefined} />
            </>
          )}
        </article>

        <article className="panel dash-panel activity-panel">
          <header className="panel-header"><div><h3>Recent activity</h3><p>Latest changes across your platform</p></div></header>
          {activity.length === 0 ? (
            <div className="api-state">{orders.isLoading ? "Loading activity…" : "No recent activity to show yet."}</div>
          ) : (
            <ul className="dash-activity" tabIndex={0} aria-label="Recent activity, scrollable">
              {activity.map((item) => (
                <li key={item.id}>
                  <button type="button" className="dash-activity-row" onClick={() => onOpenSection(item.section)}>
                    <span className="dash-list-icon"><Icon name={item.icon} size={16} /></span>
                    <span className="dash-order-main"><b>{item.title}</b><small>{item.detail}</small></span>
                    <time className="dash-order-time" dateTime={item.at} title={new Date(item.at).toLocaleString("en-IN")}>{activityTime(item.at)}</time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="panel dash-panel attention-panel">
          <header className="panel-header"><div><h3>Needs attention</h3><p>A few things to clear today</p></div>{canSeeApprovals && <span className="attention-count">{pendingApprovals}</span>}</header>
          <div className="attention-list">
            {has("restaurants") && (
              <button type="button" className="attention-row attention-row--link" onClick={() => onOpenSection("restaurants", "restaurants-approvals")}>
                <span className="attention-icon attention-icon--orange"><Icon name="store" size={16} /></span>
                <div><strong>{pendingRestaurants} restaurant approvals</strong><p>Applications waiting for review</p></div>
                <span className="attention-go">{pendingRestaurants > 0 ? "Review" : "Open"}</span>
              </button>
            )}
            {has("riders") && (
              <button type="button" className="attention-row attention-row--link" onClick={() => onOpenSection("riders", "riders-approvals")}>
                <span className="attention-icon attention-icon--indigo"><Icon name="rider" size={16} /></span>
                <div><strong>{pendingRiders} rider approvals</strong><p>Verification waiting for review</p></div>
                <span className="attention-go">{pendingRiders > 0 ? "Review" : "Open"}</span>
              </button>
            )}
            {has("sales") && (
              <button type="button" className="attention-row attention-row--link" onClick={() => onOpenSection("sales", "sales-all")}>
                <span className="attention-icon attention-icon--mint"><Icon name="wallet" size={16} /></span>
                <div><strong>Payment status</strong><p>{NOT_CONNECTED}</p></div>
                <span className="attention-go">Open</span>
              </button>
            )}
          </div>
        </article>
      </section>
    </>
  );
}
