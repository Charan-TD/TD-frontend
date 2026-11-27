"use client";

import { useMemo, useState } from "react";

import { orderTotal, rupees } from "../../admin/viewmodels/userOrders";
import { useGetAllOrdersQuery, type Order } from "../../orders/api/ordersApi";
import { useGetAllRestaurantsQuery } from "../../restaurants/api/restaurantsApi";
import { useGetAllStationsQuery, type Station } from "../api/stationsApi";

type Period = "month" | "last-month" | "30" | "all";
const PERIODS: [Period, string][] = [["month", "This month"], ["last-month", "Last month"], ["30", "Last 30 days"], ["all", "All time"]];
const PREVIOUS: Record<Period, string> = { month: "last month", "last-month": "the month before", "30": "the previous 30 days", all: "" };

const isCancelled = (status: string | null | undefined) => /cancel/i.test(String(status ?? ""));
const at = (order: Order) => (order.created_at ? new Date(order.created_at).getTime() : NaN);
const initials = (station: Station) => (station.code?.trim() || station.name.trim().slice(0, 2)).toUpperCase();

/** [start, end) of the chosen period and of the one before it, as timestamps. */
function windows(period: Period, now: number): { current: [number, number]; previous: [number, number] | null } {
  const today = new Date(now);
  if (period === "all") return { current: [0, Infinity], previous: null };
  if (period === "30") return { current: [now - 30 * 86_400_000, Infinity], previous: [now - 60 * 86_400_000, now - 30 * 86_400_000] };
  const offset = period === "month" ? 0 : -1;
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1).getTime();
  const end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 1).getTime();
  return { current: [start, end], previous: [new Date(today.getFullYear(), today.getMonth() + offset - 1, 1).getTime(), start] };
}

const inside = (order: Order, [from, to]: [number, number]) => { const time = at(order); return !Number.isNaN(time) && time >= from && time < to; };
const delta = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);
const deltaText = (value: number | null, period: Period) => (value == null || !PREVIOUS[period] ? (period === "all" ? "all time" : "no earlier data to compare") : `${value >= 0 ? "+" : ""}${value}% vs ${PREVIOUS[period]}`);

export function StationPerformanceView() {
  const ordersQuery = useGetAllOrdersQuery();
  const stationsQuery = useGetAllStationsQuery();
  const restaurantsQuery = useGetAllRestaurantsQuery();
  const [stationId, setStationId] = useState("all");
  const [period, setPeriod] = useState<Period>("month");
  const [now] = useState(() => Date.now());

  const stations = useMemo(() => [...(stationsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [stationsQuery.data]);
  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  /** The station an order is delivered at. */
  const stationOf = useMemo(() => {
    const byCode = new Map(stations.filter((s) => s.code).map((s) => [s.code!.trim().toUpperCase(), s.id]));
    const byId = new Set(stations.map((s) => s.id));
    const byName = new Map(stations.map((s) => [s.name.trim().toLowerCase(), s.id]));
    return (order: Order): string | null =>
      (order.delivery_station_code ? byCode.get(order.delivery_station_code.trim().toUpperCase()) : undefined)
      ?? (order.delivery_station_id && byId.has(order.delivery_station_id) ? order.delivery_station_id : undefined)
      ?? (order.delivery_station_name ? byName.get(order.delivery_station_name.trim().toLowerCase()) : undefined)
      ?? null;
  }, [stations]);

  const { current, previous } = windows(period, now);
  const figures = useMemo(() => {
    const scope = (order: Order) => stationId === "all" || stationOf(order) === stationId;
    const now_ = orders.filter((order) => scope(order) && inside(order, current));
    const before = previous ? orders.filter((order) => scope(order) && inside(order, previous)) : [];
    const sales = (list: Order[]) => list.filter((order) => !isCancelled(order.status)).reduce((sum, order) => sum + orderTotal(order), 0);

    const rows = stations.map((station) => {
      const mine = orders.filter((order) => inside(order, current) && stationOf(order) === station.id);
      const cancelled = mine.filter((order) => isCancelled(order.status)).length;
      const restaurants = new Set(mine.map((order) => order.restaurant_id ?? order.restaurant_name).filter(Boolean));
      return { station, orders: mine.length, revenue: sales(mine), restaurants: restaurants.size, cancelRate: mine.length ? (cancelled / mine.length) * 100 : 0 };
    });
    const restaurantsHere = new Set(now_.map((order) => order.restaurant_id ?? order.restaurant_name).filter(Boolean));
    return { total: now_.length, revenue: sales(now_), ordersDelta: delta(now_.length, before.length), revenueDelta: delta(sales(now_), sales(before)), rows, restaurantsHere: restaurantsHere.size };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `current`/`previous` are rebuilt each render from the same inputs.
  }, [orders, stations, stationOf, stationId, period, now]);

  const activeRestaurants = (restaurantsQuery.data ?? []).filter((restaurant) => String(restaurant.status).toLowerCase() === "active").length;
  const loading = ordersQuery.isLoading || stationsQuery.isLoading;
  const failed = ordersQuery.isError || stationsQuery.isError;
  const show = (value: string) => (loading ? "—" : value);

  const sorted = [...figures.rows].sort((a, b) => b.orders - a.orders || a.station.name.localeCompare(b.station.name));
  const top = Math.max(1, ...sorted.map((row) => row.orders));
  const selected = stations.find((station) => station.id === stationId);
  const periodLabel = PERIODS.find(([id]) => id === period)?.[1] ?? "";

  return (
    <section className="td-perf">
      <header className="td-perf-head td-perf-head--center">
        <p>Showing {selected ? selected.name : "all stations"} · {periodLabel}</p>
        <div className="td-perf-filters">
          <label className="td-select">
            <select value={stationId} onChange={(event) => setStationId(event.target.value)} aria-label="Station">
              <option value="all">All stations</option>
              {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
            </select>
          </label>
          <label className="td-select">
            <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} aria-label="Time range">
              {PERIODS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
        </div>
      </header>

      {failed && <div className="api-state api-state--error" role="alert">Unable to load station figures. Check the API connection and refresh.</div>}

      <div className="td-perf-tiles td-perf-tiles--four">
        <div><small>Total orders</small><strong>{show(figures.total.toLocaleString("en-IN"))}</strong><span>{deltaText(figures.ordersDelta, period)}</span></div>
        <div><small>Revenue</small><strong>{show(rupees(figures.revenue))}</strong><span>{deltaText(figures.revenueDelta, period)}</span></div>
        <div><small>Active restaurants</small><strong>{show(String(selected ? figures.restaurantsHere : activeRestaurants))}</strong><span>{selected ? "with orders here" : `across ${stations.length} stations`}</span></div>
        <div><small>Avg delivery time</small><strong>—</strong><span>not tracked yet</span></div>
      </div>

      <div className="td-perf-card">
        <h3>Orders by station</h3>
        <ul className="td-sp-bars">
          {sorted.map((row) => (
            <li key={row.station.id}>
              <span>{row.station.name}</span>
              <i><u style={{ width: `${(row.orders / top) * 100}%` }} /></i>
              <b>{row.orders.toLocaleString("en-IN")}</b>
            </li>
          ))}
        </ul>
        {!sorted.length && !loading && <p className="td-user-empty">No stations to show.</p>}
      </div>

      <div className="td-table-card">
        <div className="td-table-card-head"><h3>Station breakdown</h3></div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Station</th><th className="td-th-right">Orders</th><th className="td-th-right">Revenue</th><th className="td-th-right">Restaurants</th><th className="td-th-right">Avg delivery</th><th className="td-th-right">Cancelled</th></tr></thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.station.id}>
                  <td><div className="td-st-name"><span className="td-st-code">{initials(row.station)}</span>{row.station.name}</div></td>
                  <td className="td-num">{row.orders.toLocaleString("en-IN")}</td>
                  <td className="td-num"><strong>{rupees(row.revenue)}</strong></td>
                  <td className="td-num">{row.restaurants}</td>
                  <td className="td-num td-faint">—</td>
                  <td className={`td-num${row.cancelRate >= 3 ? " td-num--bad" : ""}`}>{row.orders ? `${row.cancelRate.toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!sorted.length && <div className="api-state">{loading ? "Loading..." : "No stations found."}</div>}
        </div>
      </div>
    </section>
  );
}
