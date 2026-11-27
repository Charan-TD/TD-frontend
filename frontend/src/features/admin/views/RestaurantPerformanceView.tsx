"use client";

import { useMemo, useState } from "react";

import { useGetAllOrdersQuery, type Order } from "../../orders/api/ordersApi";
import { useGetAllRestaurantsQuery, type Restaurant } from "../../restaurants/api/restaurantsApi";
import { Icon } from "../components/Icon";
import { InitialsAvatar } from "../components/InitialsAvatar";
import { orderTotal, rupees } from "../viewmodels/userOrders";

type Sort = "sales" | "orders" | "name";
const RANGES = [{ days: 7, label: "Last 7 days" }, { days: 30, label: "Last 30 days" }, { days: 90, label: "Last 90 days" }, { days: 0, label: "All time" }];
const isCancelled = (status: string | null | undefined) => /cancel/i.test(String(status ?? ""));
const dayMonth = (d: Date, year = false) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });

type Row = { restaurant: Restaurant; orders: number; sales: number; cancelled: number };

export function RestaurantPerformanceView() {
  const ordersQuery = useGetAllOrdersQuery();
  const restaurantsQuery = useGetAllRestaurantsQuery();
  const [station, setStation] = useState("all");
  const [restaurantId, setRestaurantId] = useState("all");
  const [days, setDays] = useState(7);
  const [sort, setSort] = useState<Sort>("sales");
  const [now] = useState(() => Date.now());

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const restaurants = useMemo(() => restaurantsQuery.data ?? [], [restaurantsQuery.data]);
  const stations = useMemo(() => [...new Set(orders.map((o) => o.delivery_station_name).filter((n): n is string => !!n))].sort(), [orders]);

  const inRange = useMemo(() => {
    const cutoff = days ? now - days * 86400000 : 0;
    return orders.filter((o) => {
      const at = o.created_at ? new Date(o.created_at).getTime() : 0;
      return at >= cutoff && (station === "all" || o.delivery_station_name === station);
    });
  }, [orders, days, station, now]);

  /** Every restaurant at the chosen station, before the restaurant filter and sorting. */
  const stationRows = useMemo<Row[]>(() => {
    const byKey = new Map<string, Row>();
    const keyOf = (r: Restaurant) => r.id || r.name.toLowerCase();
    const byName = new Map(restaurants.map((r) => [r.name.toLowerCase(), r]));
    const matchOf = (o: Order) => (o.restaurant_id ? restaurants.find((r) => r.id === o.restaurant_id) : undefined) ?? (o.restaurant_name ? byName.get(o.restaurant_name.toLowerCase()) : undefined);

    // There is no restaurant-to-station link in the admin API, so a restaurant belongs to a station once
    // it has delivered an order there (at any time, not only inside the chosen range).
    const atStation = new Set<string>();
    if (station !== "all") {
      orders.forEach((o) => {
        if (o.delivery_station_name !== station) return;
        const match = matchOf(o);
        if (match) atStation.add(keyOf(match));
      });
    }
    restaurants.forEach((r) => { if (station === "all" || atStation.has(keyOf(r))) byKey.set(keyOf(r), { restaurant: r, orders: 0, sales: 0, cancelled: 0 }); });
    inRange.forEach((o) => {
      const match = matchOf(o);
      if (!match) return;
      const row = byKey.get(keyOf(match));
      if (!row) return;
      row.orders += 1;
      if (isCancelled(o.status)) row.cancelled += 1;
      else row.sales += orderTotal(o);
    });
    return [...byKey.values()];
  }, [restaurants, orders, inRange, station]);

  const rows = useMemo(
    () => stationRows
      .filter((row) => restaurantId === "all" || row.restaurant.id === restaurantId)
      .sort((a, b) => sort === "name" ? a.restaurant.name.localeCompare(b.restaurant.name) : sort === "orders" ? b.orders - a.orders || b.sales - a.sales : b.sales - a.sales || b.orders - a.orders),
    [stationRows, restaurantId, sort],
  );

  const totalOrders = rows.reduce((n, r) => n + r.orders, 0);
  const totalSales = rows.reduce((n, r) => n + r.sales, 0);
  const withOrders = rows.filter((r) => r.orders > 0).length;
  const activeCount = stationRows.filter((row) => String(row.restaurant.status).toLowerCase() === "active").length;
  const topSales = Math.max(1, ...rows.map((r) => r.sales));
  const rangeDays = days || Math.max(1, Math.ceil((now - Math.min(now, ...inRange.map((o) => new Date(o.created_at ?? now).getTime()))) / 86400000));
  const start = new Date(now - (days || rangeDays) * 86400000);
  const periodLabel = days === 0 ? "all time" : `in the last ${days} days`;

  const download = () => {
    const csv = [["Restaurant", "Orders", "Sales", "Cancelled", "Rating"], ...rows.map((r) => [r.restaurant.name, r.orders, r.sales, r.cancelled, r.restaurant.rating ?? ""])]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "restaurant-performance.csv" });
    link.click();
    URL.revokeObjectURL(url);
  };

  const loading = ordersQuery.isLoading || restaurantsQuery.isLoading;
  const failed = ordersQuery.isError || restaurantsQuery.isError;
  const scope = `${restaurantId === "all" ? "all restaurants" : restaurants.find((r) => r.id === restaurantId)?.name ?? "this restaurant"} at ${station === "all" ? "all stations" : station}`;

  return (
    <section className="td-perf">
      <header className="td-perf-head">
        <div><h2>Restaurant Performance</h2><p>Showing {scope}</p></div>
        <div className="td-perf-filters">
          <Select label="Station" value={station} onChange={(value) => { setStation(value); setRestaurantId("all"); }} options={[["all", "All stations"], ...stations.map((s): [string, string] => [s, s])]} />
          <Select label="Restaurant" value={restaurantId} onChange={setRestaurantId} options={[["all", "All restaurants"], ...stationRows.map((row) => row.restaurant).filter((r) => r.id).map((r): [string, string] => [r.id, r.name])]} />
          <Select label="Time range" value={String(days)} onChange={(v) => setDays(Number(v))} options={RANGES.map((r): [string, string] => [String(r.days), r.label])} />
        </div>
      </header>

      {failed && <div className="api-state api-state--error">Unable to load performance data. Check the API connection and refresh.</div>}

      <div className="td-perf-tiles">
        <div><small>Orders</small><strong>{loading ? "-" : totalOrders}</strong><span>{periodLabel}</span></div>
        <div><small>Gross sales</small><strong>{loading ? "-" : rupees(totalSales)}</strong><span>{rupees(totalSales / rangeDays)} a day on average</span></div>
        <div><small>Restaurants with orders</small><strong>{loading ? "-" : `${withOrders} of ${activeCount}`}</strong><span>active restaurants</span></div>
      </div>

      <div className="td-perf-card">
        <h3>Sales by restaurant</h3>
        <p>{days === 0 ? "All time" : `${dayMonth(start)} – ${dayMonth(new Date(now), true)}`}</p>
        <div className="td-perf-bars">
          {rows.slice(0, 9).map((r) => (
            <div key={r.restaurant.id || r.restaurant.name}>
              <span><b>{r.restaurant.name}</b><em>{rupees(r.sales)}</em></span>
              <i><u style={{ width: `${(r.sales / topSales) * 100}%` }} /></i>
            </div>
          ))}
          {!rows.length && !loading && <p className="td-user-empty">No restaurants to show.</p>}
        </div>
      </div>

      <div className="td-table-card">
        <div className="td-table-card-head">
          <h3>Restaurant breakdown</h3>
          <div className="td-perf-tools">
            <label className="td-select"><span>Sort:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort restaurants">
                <option value="sales">Highest sales</option><option value="orders">Most orders</option><option value="name">Name</option>
              </select>
            </label>
            <button type="button" className="td-outline-btn" onClick={download} disabled={!rows.length}><Icon name="download" size={14} />Download</button>
          </div>
        </div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Restaurant</th><th>Orders</th><th>Sales</th><th>Cancelled</th><th>Rating</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.restaurant.id || r.restaurant.name}>
                  <td><div className="td-member"><InitialsAvatar name={r.restaurant.name === "Unnamed restaurant" ? "?" : r.restaurant.name} imageUrl={r.restaurant.logoUrl} size={32} /><span><strong>{r.restaurant.name}</strong></span></div></td>
                  <td className="td-perf-orders">{r.orders}</td>
                  <td><strong>{rupees(r.sales)}</strong></td>
                  <td className="td-perf-cancelled">{r.cancelled}</td>
                  <td className="td-muted">{r.restaurant.rating != null ? `★ ${r.restaurant.rating.toFixed(1)}` : "No ratings yet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="api-state">{loading ? "Loading..." : "No restaurants found."}</div>}
        </div>
      </div>
    </section>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <label className="td-select">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </label>
  );
}
