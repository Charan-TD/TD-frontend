"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PortalSection } from "../models/portal";
import { Icon } from "../components/Icon";
import { RevenueChart, OrdersChart, type OrderBucket } from "../components/DashboardCharts";
import { formatStamp } from "../components/useNotifications";
import { orderStatusTone } from "../models/orderStatusTone";
import { PeriodFilter } from "../components/PeriodFilter";
import { addDays, inPeriod, ordinalDate, periodRangeLabel, periodShortRange, resolvePeriod, sameDay, type Period } from "../models/dashboardPeriod";
import { useGetUsersQuery } from "../api/usersApi";
import { useGetAllOrdersQuery, type Order } from "../../orders/api/ordersApi";
import { useGetRidersQuery } from "../../riders/api/ridersApi";
import { useGetStationsTotalQuery } from "../../stations/api/stationsApi";
import { useGetRestaurantsTotalQuery } from "../../restaurants/api/restaurantsApi";
import { useGetRegistrationRequestsQuery } from "../../restaurants/api/registrationRequestsApi";
import { useGetProfileEditRequestsQuery } from "../../restaurants/api/profileEditRequestsApi";
import { useGetEmployeesQuery } from "../../employees/api/adminUsersApi";

type Props = { access: PortalSection[]; onOpenSection: (section: PortalSection, subsectionId?: string) => void };

type IconName = Parameters<typeof Icon>[0]["name"];
type SummaryCard = { section: PortalSection; label: string; value: string; caption: string; icon: IconName; badge?: number };

type ActivityItem = { id: string; section: PortalSection; icon: IconName; at: string; title: string; detail: string; status?: string };


const isPending = (status: unknown) => String(status).toLowerCase() === "pending";


const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const dayLabel = (date: Date) => date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
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

/* ------------------------------------------------------------------ new dashboard */

const pad2 = (value: number) => String(value).padStart(2, "0");
const weekday = (date: Date) => date.toLocaleDateString("en-IN", { weekday: "short" });

/** Orders per day for the chosen period (per hour when it is a single day). */
function buildOrderBuckets(orders: Order[], period: Period): OrderBucket[] {
  const single = sameDay(period.from, period.to);
  const dates = (order: Order) => (order.created_at ? new Date(order.created_at) : null);
  if (single) {
    const buckets: OrderBucket[] = Array.from({ length: 24 }, (_, hour) => ({
      key: String(hour), count: 0, revenue: 0,
      label: `${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`,
      full: `${ordinalDate(period.from)} · ${hour % 12 || 12} ${hour < 12 ? "AM" : "PM"}`,
    }));
    orders.forEach((order) => {
      const date = dates(order);
      if (date && !Number.isNaN(date.getTime()) && inPeriod(date, period)) { buckets[date.getHours()].count += 1; buckets[date.getHours()].revenue += Number(order.total) || 0; }
    });
    return buckets;
  }
  const days = Math.round((period.to.getTime() - period.from.getTime()) / 86_400_000) + 1;
  const buckets: OrderBucket[] = Array.from({ length: days }, (_, i) => {
    const date = addDays(period.from, i);
    return { key: dayKey(date), count: 0, revenue: 0, label: days <= 7 ? weekday(date) : dayLabel(date), full: ordinalDate(date) };
  });
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  orders.forEach((order) => {
    const date = dates(order);
    if (!date || Number.isNaN(date.getTime())) return;
    const bucket = byKey.get(dayKey(date));
    if (bucket) { bucket.count += 1; bucket.revenue += Number(order.total) || 0; }
  });
  return buckets;
}

/** The same dates one year earlier, so each day lines up with the day it is compared to. */
function lastYearPeriod(period: Period): Period {
  const back = (date: Date) => new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
  return { id: "custom", from: back(period.from), to: back(period.to) };
}

/** "2026", or "2025–2026" when the period crosses a year end. */
const yearsLabel = (period: Period) => (period.from.getFullYear() === period.to.getFullYear() ? String(period.to.getFullYear()) : `${period.from.getFullYear()}–${period.to.getFullYear()}`);

/** Stretch or squeeze the sample curve to n points. */
function resample(values: number[], n: number) {
  if (n <= 1) return [values[0]];
  return Array.from({ length: n }, (_, i) => {
    const position = (i / (n - 1)) * (values.length - 1);
    const lo = Math.floor(position), hi = Math.min(lo + 1, values.length - 1);
    return values[lo] + (values[hi] - values[lo]) * (position - lo);
  });
}

// Shown (and labelled "Sample data") only while there is no revenue to draw yet.
const SAMPLE_PREVIOUS = [23000, 19000, 18500, 22500, 30000, 38200, 29000, 24500, 27000, 28800, 26500, 27800];
const SAMPLE_CURRENT = [26000, 14000, 32500, 23000, 26500, 30500, 22000, 30500, 34000, 17600, 33500, 34000];

const SERIES_PREVIOUS = { color: "#3b82c4", tint: "#e3effa", ink: "#1f5f9a" };
const SERIES_CURRENT = { color: "#e8700d", tint: "#fbe9d4", ink: "#8a4300" };

function downloadReport(period: Period, buckets: OrderBucket[]) {
  const rows = [["Period", periodRangeLabel(period)], [], ["Date", "Orders"], ...buckets.map((b) => [b.full, String(b.count)])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders-report-${dayKey(period.from)}-to-${dayKey(period.to)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DashboardView({ access, onOpenSection, adminName }: Props & { adminName: string }) {
  const [period, setPeriod] = useState<Period>(() => resolvePeriod("7d"));
  const has = (section: PortalSection) => access.includes(section);

  const users = useGetUsersQuery({ page: 1, limit: 1 }, { skip: !has("users") });
  const employees = useGetEmployeesQuery({ page: 1, limit: 1 }, { skip: !has("employees") });
  // Counts come from the server's pagination total, not from the length of a capped page.
  const restaurants = useGetRestaurantsTotalQuery(undefined, { skip: !has("restaurants") });
  const pendingRegistrations = useGetRegistrationRequestsQuery("pending", { skip: !has("restaurants") });
  const pendingProfileEdits = useGetProfileEditRequestsQuery("pending", { skip: !has("restaurants") });
  const pendingRestaurants = (pendingRegistrations.data?.length ?? 0) + (pendingProfileEdits.data?.length ?? 0);
  // Rider statuses are filtered here, not with `?status=`: the deployed API rejects
  // `status=PENDING` for delivery partners (400 "Invalid delivery partner status").
  const riders = useGetRidersQuery(undefined, { skip: !has("riders") });
  const orders = useGetAllOrdersQuery(undefined, { skip: !has("orders") });
  const stations = useGetStationsTotalQuery(undefined, { skip: !has("stations") });

  const caption = (error: boolean, text: string) => (error ? "Unable to load" : text);
  const padded = (loading: boolean, error: boolean, count: number | undefined) => (loading ? "…" : error ? "-" : pad2(count ?? 0));

  const candidates: SummaryCard[] = [
    has("orders")
      ? { section: "orders", label: "Total Orders", value: padded(orders.isLoading, orders.isError, orders.data?.length), caption: caption(orders.isError, "All orders placed"), icon: "receipt" }
      : { section: "employees", label: "Employees", value: padded(employees.isLoading, employees.isError, employees.data?.total), caption: caption(employees.isError, "Staff accounts"), icon: "employee" },
    { section: "restaurants", label: "Restaurants", value: padded(restaurants.isLoading, restaurants.isError, restaurants.data), caption: caption(restaurants.isError, "awaiting approval"), icon: "store", badge: restaurants.isError ? undefined : pendingRestaurants },
    { section: "users", label: "Users", value: padded(users.isLoading, users.isError, users.data?.pagination.total), caption: caption(users.isError, "Registered customers"), icon: "users" },
    { section: "stations", label: "Stations", value: padded(stations.isLoading, stations.isError, stations.data), caption: caption(stations.isError, "Configured stations"), icon: "station" },
  ];
  const stats = candidates.filter((item) => has(item.section));

  const pendingRiders = riders.data?.filter((r) => isPending(r.status)).length ?? 0;

  const allOrders = useMemo(() => orders.data ?? [], [orders.data]);
  const buckets = useMemo(() => buildOrderBuckets(allOrders, period), [allOrders, period]);
  const periodOrders = buckets.reduce((sum, bucket) => sum + bucket.count, 0);

  // Revenue follows the filter; the blue line is the same dates last year.
  const revenue = useMemo(() => {
    const before = buildOrderBuckets(allOrders, lastYearPeriod(period));
    const previous = before.map((bucket) => bucket.revenue);
    const current = buckets.map((bucket) => bucket.revenue);
    const empty = [...previous, ...current].every((value) => value === 0);
    return {
      previous: empty ? resample(SAMPLE_PREVIOUS, current.length) : previous,
      current: empty ? resample(SAMPLE_CURRENT, current.length) : current,
      sample: empty,
    };
  }, [allOrders, buckets, period]);
  const lastYear = lastYearPeriod(period);

  // Activity feed built from what the API exposes: new orders and restaurant requests.
  const activity = useMemo(() => {
    const items: ActivityItem[] = [];
    allOrders.forEach((order, index) => {
      if (!order.created_at) return;
      items.push({
        id: `order-${order.id ?? order.order_number ?? index}-${index}`, section: "orders", icon: "receipt", at: order.created_at,
        title: `New order${order.order_number ? ` #${order.order_number}` : ""}`,
        detail: [order.restaurant_name, order.total != null && order.total !== "" ? rupees(Number(order.total) || 0) : null, order.delivery_station_name].filter(Boolean).join(" · "),
        status: order.status_label || order.status || undefined,
      });
    });
    (pendingRegistrations.data ?? []).forEach((request) => {
      if (!request.createdAt) return;
      items.push({ id: `registration-${request.requestId}`, section: "restaurants", icon: "store", at: request.createdAt, title: "Restaurant registration", detail: [request.restaurantName, request.ownerName].filter(Boolean).join(" · "), status: "Pending" });
    });
    (pendingProfileEdits.data ?? []).forEach((request) => {
      if (!request.createdAt) return;
      items.push({ id: `edit-${request.id}`, section: "restaurants", icon: "edit", at: request.createdAt, title: "Restaurant profile edit request", detail: `${Object.keys(request.requestedChanges).length} field(s) awaiting review`, status: "Pending" });
    });
    return items.filter((item) => !Number.isNaN(Date.parse(item.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 40);
  }, [allOrders, pendingRegistrations.data, pendingProfileEdits.data]);

  type Task = { id: string; title: string; detail: string; done: boolean; action: string; section: PortalSection; subsection: string };
  const tasks: Task[] = [];
  if (has("restaurants")) tasks.push({ id: "restaurants", title: pendingRestaurants > 0 ? `Approve ${pendingRestaurants} ${pendingRestaurants === 1 ? "restaurant" : "restaurants"}` : "Restaurant approvals", detail: pendingRestaurants > 0 ? "Applications waiting for review" : "No applications waiting for review", done: pendingRestaurants === 0 && !pendingRegistrations.isLoading, action: "Review", section: "restaurants", subsection: "restaurants-approvals" });
  if (has("sales")) tasks.push({ id: "payments", title: "Connect payments", detail: "Payment status is not connected yet", done: false, action: "Connect", section: "sales", subsection: "sales-all" });
  if (has("riders")) tasks.push({ id: "riders", title: "Rider approvals", detail: pendingRiders > 0 ? `${pendingRiders} ${pendingRiders === 1 ? "rider" : "riders"} waiting for verification` : "No riders waiting for verification", done: pendingRiders === 0 && !riders.isLoading, action: "Review", section: "riders", subsection: "riders-approvals" });
  const doneCount = tasks.filter((task) => task.done).length;

  return (
    <div className="td-dashboard">
      <div className="td-pagehead">
        <div><h1>Dashboard</h1><p>Hi, {adminName.trim() || "there"}. Welcome back to Train Dabba Admin!</p></div>
        <PeriodFilter period={period} onChange={setPeriod} />
      </div>

      {stats.length > 0 && (
        <section className="td-stats" aria-label="Platform snapshot">
          {stats.map((item) => (
            <button type="button" className="td-stat" key={item.label} onClick={() => onOpenSection(item.section)} aria-label={`Open ${item.label}`}>
              <span className="td-stat-icon"><Icon name={item.icon} size={20} /></span>
              <span className="td-stat-body">
                <strong>{item.value}</strong>
                <b>{item.label}</b>
                <small>{item.badge !== undefined && item.badge > 0 && <i className="td-stat-badge"><u />{item.badge}</i>}{item.badge !== undefined && item.badge === 0 ? "No approvals waiting" : item.caption}</small>
              </span>
            </button>
          ))}
        </section>
      )}

      <section className="td-charts">
        <article className="td-card td-revenue">
          <header className="td-card-head">
            <h3>Total Revenue</h3>
            <div className="td-legend">
              {revenue.sample && <span className="td-chip">Sample data</span>}
              <span title={`Last year: ${periodRangeLabel(lastYear)}`}><i style={{ background: SERIES_PREVIOUS.color }} />{yearsLabel(lastYear)}</span>
              <span title={periodRangeLabel(period)}><i style={{ background: SERIES_CURRENT.color }} />{yearsLabel(period)}</span>
            </div>
          </header>
          {!has("orders") ? <div className="api-state">Order data is not available for this account.</div>
            : orders.isLoading ? <div className="api-state">Loading chart…</div>
            : orders.isError ? <div className="api-state api-state--error">Unable to load order data.</div>
            : <RevenueChart labels={buckets.map((bucket) => bucket.label)} fullLabels={buckets.map((bucket) => bucket.full)} series={[{ name: yearsLabel(lastYear), ...SERIES_PREVIOUS, values: revenue.previous }, { name: yearsLabel(period), ...SERIES_CURRENT, values: revenue.current }]} />}
        </article>

        <article className="td-card td-orders">
          <header className="td-card-head">
            <div><h3>Chart Order</h3><p>Orders per day, {periodShortRange(period)}{sameDay(period.from, period.to) ? "" : `, ${period.to.getFullYear()}`}</p></div>
            <button type="button" className="td-outline-btn" onClick={() => downloadReport(period, buckets)} disabled={!has("orders") || orders.isLoading}><Icon name="download" size={14} />Save Report</button>
          </header>
          {!has("orders") ? <div className="api-state">Order data is not available for this account.</div>
            : orders.isLoading ? <div className="api-state">Loading chart…</div>
            : orders.isError ? <div className="api-state api-state--error">Unable to load order data.</div>
            : <><OrdersChart buckets={buckets} /><span className="sr-only">{periodOrders} orders in this period</span></>}
        </article>
      </section>

      <section className="td-lists">
        <article className="td-card td-attention">
          <header className="td-card-head">
            <div><h3>Needs Attention</h3><p>Complete these to keep things running</p></div>
            {tasks.length > 0 && <span className="td-count">{doneCount} of {tasks.length} done</span>}
          </header>
          <div className="td-progress" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={doneCount}><i style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} /></div>
          <ul className="td-tasks">
            {tasks.length === 0 && <li className="td-empty">Nothing needs your attention.</li>}
            {tasks.map((task) => (
              <li key={task.id} className={task.done ? "is-done" : ""}>
                <span className="td-check" aria-hidden="true">{task.done && <Icon name="check" size={12} stroke={3} />}</span>
                <span className="td-task-copy"><strong>{task.title}</strong><small>{task.detail}</small></span>
                {task.done ? <span className="td-done-label">Done</span>
                  : <button type="button" className={task.action === "Review" ? "td-task-btn td-task-btn--primary" : "td-task-btn"} onClick={() => onOpenSection(task.section, task.subsection)}>{task.action}</button>}
              </li>
            ))}
          </ul>
        </article>

        <article className="td-card td-activity">
          <header className="td-card-head">
            <div><h3>Recent Activity</h3><p>Latest changes across your platform</p></div>
            {has("orders") && <button type="button" className="td-outline-btn" onClick={() => onOpenSection("orders", "orders-all")}>View all</button>}
          </header>
          {activity.length === 0 ? (
            <div className="api-state">{orders.isLoading ? "Loading activity…" : "No recent activity to show yet."}</div>
          ) : (
            <ul className="td-feed" tabIndex={0} aria-label="Recent activity, scrollable">
              {activity.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onOpenSection(item.section)}>
                    <span className="td-feed-icon"><Icon name={item.icon} size={16} /></span>
                    <span className="td-feed-copy"><b>{item.title}</b><small>{item.detail}</small></span>
                    <span className="td-feed-meta">
                      {item.status && <em className={`td-pill td-pill--${orderStatusTone(item.status)}`}>{item.status}</em>}
                      <time dateTime={item.at}>{formatStamp(item.at)}</time>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
