"use client";

import { useState, type ReactNode } from "react";

import { ConfirmDialog } from "../../admin/components/ConfirmDialog";
import { PageFooter } from "../../admin/components/PageFooter";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { SidePanel } from "../../admin/components/SidePanel";
import { SkeletonTable } from "../../admin/components/Skeleton";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { useGetAllStationsQuery } from "../../stations/api/stationsApi";
import { useGetAllOrdersQuery, useGetOrdersPageQuery, useGetOrdersTotalQuery, useUpdateOrderStatusMutation, type Order } from "../api/ordersApi";

const PAGE_SIZE = 10;

type Tab = "all" | "active" | "delivered" | "cancelled";
type Period = "today" | "yesterday" | "7d" | "30d" | "all";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

const statusKey = (order: Order) => String(order.status ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");

const STATUS_LABEL: Record<string, string> = {
  PLACED: "Placed", CONFIRMED: "Confirmed", PREPARING: "Preparing", READY: "Ready", OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered", CANCELLED: "Cancelled", FAILED: "Failed",
};
const STATUS_TONE: Record<string, string> = {
  PLACED: "info", CONFIRMED: "info", PREPARING: "warn", READY: "purple", OUT_FOR_DELIVERY: "orange",
  DELIVERED: "ok", CANCELLED: "bad", FAILED: "bad",
};

const statusLabel = (order: Order) => STATUS_LABEL[statusKey(order)] ?? order.status_label ?? order.status ?? "-";

function StatusDot({ order }: { order: Order }) {
  return <span className={`td-ord-status td-ord-status--${STATUS_TONE[statusKey(order)] ?? "muted"}`}>{statusLabel(order)}</span>;
}

const toDate = (value: string | null | undefined) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const time = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const day = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const fullDay = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const money = (value: unknown) => {
  const amount = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount) ? `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : null;
};
const amountOf = (value: unknown) => {
  const amount = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount) ? amount : null;
};

const inPeriod = (order: Order, period: Period, now: Date) => {
  if (period === "all") return true;
  const created = toDate(order.created_at);
  if (!created) return false;
  if (period === "today") return sameDay(created, now);
  if (period === "yesterday") return sameDay(created, new Date(now.getTime() - 86_400_000));
  const days = period === "7d" ? 7 : 30;
  return now.getTime() - created.getTime() <= days * 86_400_000;
};

const stationOf = (order: Order) => order.delivery_station_name || order.station_name || order.boarding_station_name || "";

export function OrdersView() {
  const [now] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [station, setStation] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);

  const term = search.trim().toLowerCase();
  // Plain browsing (all stations, any time, no search, a status the server knows) uses the server's pages.
  // The API can't filter by station, period or search, nor by "active" (several statuses), so those load
  // every order (cached) and filter here.
  const local = term !== "" || station !== "all" || period !== "all" || tab === "active";
  const allQuery = useGetAllOrdersQuery(undefined, { skip: !local });
  const statusParam = tab === "delivered" ? "DELIVERED" : tab === "cancelled" ? "CANCELLED" : undefined;
  const pageQuery = useGetOrdersPageQuery({ page, limit: PAGE_SIZE, status: statusParam }, { skip: local });
  const totalAll = useGetOrdersTotalQuery();
  const totalDelivered = useGetOrdersTotalQuery({ status: "DELIVERED" });
  const totalCancelled = useGetOrdersTotalQuery({ status: "CANCELLED" });
  const stationsQuery = useGetAllStationsQuery();
  const orders = allQuery.data ?? [];
  const isLoading = local ? allQuery.isLoading : pageQuery.isLoading;
  const isError = local ? allQuery.isError : pageQuery.isError;
  const fetching = local ? allQuery.isFetching : pageQuery.isFetching;
  const stations = [...new Set([...(stationsQuery.data ?? []).map((item) => item.name), ...orders.map(stationOf)].filter(Boolean))].sort();

  const scoped = orders
    .filter((order) => station === "all" || stationOf(order) === station)
    .filter((order) => inPeriod(order, period, now))
    .filter((order) => !term || [order.order_number, order.restaurant_name, order.restaurant_id, order.train_name, order.train_number, order.pnr, order.customer_name].some((value) => String(value ?? "").toLowerCase().includes(term)))
    .sort((a, b) => (toDate(b.created_at)?.getTime() ?? 0) - (toDate(a.created_at)?.getTime() ?? 0));

  const isCancelled = (order: Order) => statusKey(order) === "CANCELLED";
  const isDelivered = (order: Order) => statusKey(order) === "DELIVERED";
  const counts = local
    ? {
        all: scoped.length,
        active: scoped.filter((order) => !isCancelled(order) && !isDelivered(order)).length,
        delivered: scoped.filter(isDelivered).length,
        cancelled: scoped.filter(isCancelled).length,
      }
    : {
        all: totalAll.data ?? 0,
        active: Math.max(0, (totalAll.data ?? 0) - (totalDelivered.data ?? 0) - (totalCancelled.data ?? 0)),
        delivered: totalDelivered.data ?? 0,
        cancelled: totalCancelled.data ?? 0,
      };
  const filtered = scoped.filter((order) => tab === "all" || (tab === "delivered" ? isDelivered(order) : tab === "cancelled" ? isCancelled(order) : !isCancelled(order) && !isDelivered(order)));
  const total = local ? filtered.length : pageQuery.data?.total ?? 0;
  const totalPages = local ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : Math.max(1, pageQuery.data?.totalPages ?? 1);
  const current = Math.min(page, totalPages);
  const rows = local ? filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE) : pageQuery.data?.rows ?? [];

  const stamp = (value: string | null | undefined) => {
    const date = toDate(value);
    return date ? (sameDay(date, now) ? time(date) : `${day(date)}, ${time(date)}`) : "-";
  };

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search order, restaurant, train or PNR" />
      <SectionActions>
        <label className="td-select">
          <select value={station} onChange={(event) => { setStation(event.target.value); setPage(1); }} aria-label="Station">
            <option value="all">All stations</option>
            {stations.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="td-select">
          <select value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(1); }} aria-label="Period">
            {PERIODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </SectionActions>

      {isError && <div className="api-state api-state--error">Unable to load orders. Check the API connection.</div>}

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label="Filter orders by status" value={tab} onChange={(value) => { setTab(value as Tab); setPage(1); }}
            tabs={[{ id: "all", label: "All", count: counts.all }, { id: "active", label: "Active", count: counts.active }, { id: "delivered", label: "Delivered", count: counts.delivered }, { id: "cancelled", label: "Cancelled", count: counts.cancelled }]} />
        </div>

        {isLoading && !isError && <SkeletonTable columns={["Order", "Restaurant · Station", "Delivery by", "Amount", "Status"]} />}

        {!isLoading && !isError && (
          <>
            <div className="td-table-scroll">
              <table className="td-table td-ord-table">
                <thead><tr><th>Order</th><th>Restaurant · Station</th><th>Delivery by</th><th className="td-th-right">Amount</th><th>Status</th><th><span className="td-sr">Actions</span></th></tr></thead>
                <tbody>
                  {rows.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <button type="button" className="td-ord-link" onClick={() => setSelected(order)}>{order.order_number || "-"}</button>
                        <small className="td-ord-sub">Placed {stamp(order.created_at)}</small>
                      </td>
                      <td><div className="td-contact"><span>{order.restaurant_name || "-"}</span><small>{stationOf(order) || "-"}</small></div></td>
                      <td><strong>{stamp(order.delivery_deadline)}</strong></td>
                      <td className="td-th-right">{money(order.total) ?? "-"}</td>
                      <td><StatusDot order={order} /></td>
                      <td className="td-th-right"><button type="button" className="td-view-link" onClick={() => setSelected(order)} aria-label={`View ${order.order_number ?? "order"}`}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div className="api-state">{counts.all > 0 ? "No orders match these filters." : "No orders found."}</div>}
            </div>
            {total > 0 && <PageFooter page={current} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} shown={rows.length} noun="orders" onChange={setPage} disabled={fetching} />}
          </>
        )}
      </div>

      <OrderPanel order={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

const STEPS = [
  { key: "PLACED", label: "Order placed" },
  { key: "PREPARING", label: "Accepted by restaurant" },
  { key: "READY", label: "Food ready" },
  { key: "OUT_FOR_DELIVERY", label: "Picked up by delivery partner" },
  { key: "DELIVERED", label: "Delivered at seat" },
];

function OrderPanel({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const [updateStatus, { isLoading: cancelling }] = useUpdateOrderStatusMutation();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { setConfirming(false); setError(null); onClose(); };

  if (!order) return <SidePanel open={false} onClose={onClose} title="Order">{null}</SidePanel>;

  const key = statusKey(order);
  const placed = toDate(order.created_at);
  const deadline = toDate(order.delivery_deadline);
  const updated = toDate(order.updated_at);
  const stage = key === "CONFIRMED" ? 1 : Math.max(0, STEPS.findIndex((step) => step.key === key));
  const ended = key === "CANCELLED" || key === "FAILED";
  const canCancel = !ended && key !== "DELIVERED";
  // The list falls back to the order number when the server sends no row ID; the status call needs the real one.
  const realId = !!order.id && order.id !== order.order_number && !order.id.startsWith("order-");

  const items = (order.items ?? []).map((item) => {
    const raw = item as Record<string, unknown>;
    const type = String(raw.food_served ?? raw.food_type ?? "").toLowerCase();
    return {
      name: item.name ?? item.item_name ?? "Item",
      quantity: item.quantity ?? item.qty ?? 1,
      price: money(raw.total_price ?? raw.price ?? raw.amount),
      type: type === "veg" || type === "non_veg" || type === "egg" ? type : null,
    };
  });

  const bill: [string, string | null, boolean?][] = [
    ["Item total", money(order.subtotal)],
    ["Discount", amountOf(order.discount) ? `−${money(order.discount)}` : null],
    ["Delivery fee", money(order.delivery_fee)],
    ["Packaging fee", amountOf(order.packaging_fee) ? money(order.packaging_fee) : null],
    ["Taxes", money(order.tax)],
  ];

  const onCancel = async () => {
    setError(null);
    try {
      await updateStatus({ id: order.id, status: "CANCELLED" }).unwrap();
      close();
    } catch (err) {
      const message = (err as { data?: { message?: string } } | undefined)?.data?.message;
      setConfirming(false);
      setError(message || "The order could not be cancelled. Try again.");
    }
  };

  const phone = order.customer_phone ?? order.customer_mobile;
  const train = [order.train_number, order.train_name].filter(Boolean).join(" · ");
  const seat = [order.coach, order.seat].filter(Boolean).join(" / ");
  const station = [order.delivery_station_name, order.delivery_station_code && `(${order.delivery_station_code})`].filter(Boolean).join(" ");

  return (
    <>
      <SidePanel
        open
        onClose={close}
        title={order.order_number ?? "Order"}
        header={(
          <div className="td-ord-head">
            <StatusDot order={order} />
            <h3>{order.order_number ?? "Order"}</h3>
            <p>{[placed && `Placed ${fullDay(placed)}, ${time(placed)}`, deadline && `deliver by ${time(deadline)}`].filter(Boolean).join(" · ")}</p>
          </div>
        )}
        footer={(
          <>
            <button type="button" className="td-ord-cancel" disabled={!canCancel || !realId || cancelling}
              data-tooltip={!canCancel ? undefined : !realId ? "This order has no ID from the server, so it can't be cancelled here." : undefined}
              onClick={() => { setError(null); setConfirming(true); }}>Cancel order</button>
            <button type="button" className="td-btn td-btn--small" onClick={close}>Close</button>
          </>
        )}
      >
        <div className="td-ord-panel">
          {error && <div className="api-state api-state--error" role="alert">{error}</div>}

          <section>
            <h4>Customer</h4>
            <dl>
              <Row label="Name">{order.customer_name || "-"}</Row>
              <Row label="Mobile">{phone || "-"}</Row>
              <Row label="PNR">{order.pnr || "-"}</Row>
            </dl>
          </section>

          <section>
            <h4>Train &amp; delivery</h4>
            <dl>
              <Row label="Train">{train || "-"}</Row>
              <Row label="Coach / seat">{seat || "-"}</Row>
              <Row label="Station">{station || "-"}</Row>
              {order.customer_note && <Row label="Note">{order.customer_note}</Row>}
            </dl>
          </section>

          <section>
            <h4>Restaurant</h4>
            <dl>
              <Row label="Name">{order.restaurant_name || "-"}</Row>
              <Row label="Restaurant ID">{order.restaurant_id || "-"}</Row>
            </dl>
          </section>

          <section>
            <h4>Items &amp; bill</h4>
            {items.length > 0 ? (
              <ul className="td-ord-items">
                {items.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    <span>{item.type && <i className={`td-food td-food--${item.type}`}><i /></i>}{item.name} <small>× {item.quantity}</small></span>
                    {item.price && <b>{item.price}</b>}
                  </li>
                ))}
              </ul>
            ) : <p className="td-ord-muted">{order.items_summary || "Items not provided."}</p>}
            <dl className="td-ord-bill">
              {bill.filter(([, value]) => value).map(([label, value]) => <Row key={label} label={label}>{value}</Row>)}
              <div className="is-total"><dt>Total paid</dt><dd>{money(order.total) ?? "-"}</dd></div>
            </dl>
          </section>

          <section>
            <h4>Progress</h4>
            <ol className="td-ord-steps">
              {STEPS.map((step, index) => {
                const done = !ended ? index <= stage : index === 0;
                const at = index === 0 ? placed : step.key === "DELIVERED" && key === "DELIVERED" ? updated : null;
                return <li key={step.key} className={done ? "is-done" : undefined}><span>{step.label}</span>{done && at && <small>{time(at)}</small>}</li>;
              })}
              {ended && <li className="is-done is-bad"><span>{statusLabel(order)}</span>{updated && <small>{time(updated)}</small>}</li>}
            </ol>
          </section>
        </div>
      </SidePanel>

      <ConfirmDialog
        open={confirming}
        title="Cancel this order?"
        message={<>Order <strong>{order.order_number}</strong> will be marked as cancelled.</>}
        confirmLabel="Cancel order"
        tone="danger"
        busy={cancelling}
        busyLabel="Cancelling…"
        onConfirm={onCancel}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
