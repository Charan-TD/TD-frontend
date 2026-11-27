"use client";

import { useState, type ReactNode } from "react";

import { Icon } from "../../admin/components/Icon";
import { PageFooter } from "../../admin/components/PageFooter";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { COLORS, LineChart } from "../../analytics/charts";
import { COLLECTED_PER_DAY, METHODS, PAYMENT_TOTALS, REFUND_REASONS, payments, payouts, refunds, settlements, type Payment, type Payout, type Refund } from "../paymentsSample";

/*
 * The Payments screens run on sample records (see paymentsSample.ts): there is no payments API yet.
 */

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const tone = (status: string) => ({ Successful: "ok", Settled: "ok", Paid: "ok", Processed: "ok", Pending: "warn", Initiated: "warn", "On hold": "warn", Scheduled: "info", "In transit": "info", Failed: "bad" }[status] ?? "info");

function downloadCsv(name: string, header: string[], rows: (string | number)[][]) {
  const csv = [header, ...rows].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
}

type Tile = { label: string; value: string; note: string };

/** Everything the four screens share: the top bar controls, the note, the four tiles. */
function Frame({ search, onSearch, searchPlaceholder, extra, onExport, intro, tiles, children }: {
  search?: string; onSearch?: (value: string) => void; searchPlaceholder?: string; extra?: ReactNode; onExport: () => void; intro?: string; tiles: Tile[]; children: ReactNode;
}) {
  const controls = (
    <>
      {extra}
      <label className="td-select"><select aria-label="Date range" disabled data-tooltip="Sample data can't be filtered by date yet." defaultValue="range"><option value="range">1 – 12 Nov 2026</option></select></label>
      <button type="button" className="td-btn" onClick={onExport}><Icon name="download" size={14} />Export</button>
    </>
  );
  return (
    <section className="td-perf">
      {onSearch && <SectionSearch value={search ?? ""} onChange={onSearch} placeholder={searchPlaceholder ?? "Search"} />}
      {onSearch ? <SectionActions>{controls}</SectionActions> : (
        <header className="td-perf-head td-perf-head--center"><p>{intro}</p><div className="td-perf-filters">{controls}</div></header>
      )}
      <div className="api-state" role="note">Sample data: payments aren&apos;t connected to the backend yet.</div>
      <div className="td-perf-tiles td-perf-tiles--four">
        {tiles.map((tile) => <div key={tile.label}><small>{tile.label}</small><strong>{tile.value}</strong><span>{tile.note}</span></div>)}
      </div>
      {children}
    </section>
  );
}

const Status = ({ status, note }: { status: string; note?: string }) => (
  <div className="td-contact"><span className={`td-ord-status td-ord-status--${tone(status)}`}>{status}</span>{note && <small className="td-pay-note">{note}</small>}</div>
);

/** A table card with status tabs on top and the page footer below. */
function ListCard<T extends { status: string }>({ rows, tabs, term, pageSize, noun, head, render, filter }: {
  rows: T[]; tabs: { id: string; label: string; match: (row: T) => boolean }[]; term: string; pageSize: number; noun: string; head: ReactNode; render: (row: T) => ReactNode; filter?: (row: T) => boolean;
}) {
  const [tab, setTab] = useState(tabs[0].id);
  const [page, setPage] = useState(1);
  const scoped = filter ? rows.filter(filter) : rows;
  const active = tabs.find((item) => item.id === tab) ?? tabs[0];
  const filtered = scoped.filter(active.match);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, totalPages);
  const shown = filtered.slice((current - 1) * pageSize, current * pageSize);
  return (
    <div className="td-table-card">
      <div className="td-table-card-head td-table-card-head--end">
        <StatusTabs placement="inline" label={`Filter ${noun} by status`} value={tab} onChange={(value) => { setTab(value); setPage(1); }}
          tabs={tabs.map((item) => ({ id: item.id, label: item.label, count: scoped.filter(item.match).length }))} />
      </div>
      <div className="td-table-scroll">
        <table className="td-table">
          <thead>{head}</thead>
          <tbody>{shown.map(render)}</tbody>
        </table>
        {!shown.length && <div className="api-state">{term ? `No ${noun} match your search.` : `No ${noun} here.`}</div>}
      </div>
      {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={pageSize} shown={shown.length} noun={noun} onChange={setPage} />}
    </div>
  );
}

const includes = (term: string, values: string[]) => !term || values.some((value) => value.toLowerCase().includes(term));

/* ------------------------------------------------------------ transactions */

export function TransactionsScreen() {
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const term = search.trim().toLowerCase();
  const match = (row: Payment) => includes(term, [row.id, row.order]) && (method === "all" || row.method === method);
  const days = Array.from({ length: 12 }, (_, i) => `${i + 1} Nov`);

  return (
    <Frame search={search} onSearch={setSearch} searchPlaceholder="Search payment ID or order"
      extra={<label className="td-select"><select value={method} onChange={(event) => setMethod(event.target.value)} aria-label="Payment method"><option value="all">All methods</option>{METHODS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      onExport={() => downloadCsv("transactions.csv", ["Payment", "When", "Order", "Method", "Amount", "Status"], payments.filter(match).map((row) => [row.id, row.when, row.order, row.method, row.amount, row.status]))}
      tiles={[
        { label: "Collected", value: "₹7,42,000", note: "6,214 successful payments" },
        { label: "Success rate", value: "96.8%", note: "of all payment attempts" },
        { label: "Failed", value: String(PAYMENT_TOTALS.failed), note: "₹71,400 not collected" },
        { label: "Pending", value: String(PAYMENT_TOTALS.pending), note: "₹6,120 awaiting confirmation" },
      ]}>
      <section className="td-perf-card">
        <header className="td-an-card-head"><h3>Money collected per day<small>Successful payments only</small></h3></header>
        <LineChart labels={days} labelEvery={2} ticks={[0, 20000, 40000, 60000, 80000]} format={(value) => `₹${value / 1000}k`} height={170}
          series={[{ name: "Collected", color: COLORS.teal, values: COLLECTED_PER_DAY.map((value) => value * 1000), area: true, endLabel: `₹${COLLECTED_PER_DAY[11]}k` }]} />
      </section>
      <ListCard rows={payments} filter={match} term={term} pageSize={8} noun="payments"
        tabs={[{ id: "all", label: "All", match: () => true }, { id: "ok", label: "Successful", match: (row) => row.status === "Successful" }, { id: "failed", label: "Failed", match: (row) => row.status === "Failed" }, { id: "pending", label: "Pending", match: (row) => row.status === "Pending" }]}
        head={<tr><th>Payment</th><th>Order</th><th>Method</th><th className="td-num">Amount</th><th>Status</th></tr>}
        render={(row) => (
          <tr key={row.id}>
            <td><div className="td-contact"><span className="td-pay-id">{row.id}</span><small>{row.when}</small></div></td>
            <td className="td-muted">{row.order}</td><td className="td-muted">{row.method}</td>
            <td className="td-num"><strong>{rupees(row.amount)}</strong></td><td><Status status={row.status} /></td>
          </tr>
        )} />
    </Frame>
  );
}

/* ----------------------------------------------------------------- payouts */

export function PayoutsScreen() {
  const [search, setSearch] = useState("");
  const [station, setStation] = useState("all");
  const term = search.trim().toLowerCase();
  const stations = [...new Set(payouts.map((row) => row.station))].sort();
  const match = (row: Payout) => includes(term, [row.restaurant, row.station, row.bank]) && (station === "all" || row.station === station);
  return (
    <Frame search={search} onSearch={setSearch} searchPlaceholder="Search restaurant"
      extra={<label className="td-select"><select value={station} onChange={(event) => setStation(event.target.value)} aria-label="Station"><option value="all">All stations</option>{stations.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>}
      onExport={() => downloadCsv("payouts.csv", ["Restaurant", "Station", "Period", "Orders", "Amount", "Bank account", "Status", "Note"], payouts.filter(match).map((row) => [row.restaurant, row.station, row.period, row.orders, row.amount, row.bank, row.status, row.note]))}
      tiles={[
        { label: "Paid out", value: "₹4,65,750", note: "to 51 restaurants this period" },
        { label: "Next payout", value: "₹3,12,880", note: "on 15 Nov · 48 restaurants" },
        { label: "On hold", value: "₹19,920", note: "1 restaurant · documents pending" },
        { label: "Failed", value: "₹21,640", note: "1 payout · fix bank details" },
      ]}>
      <ListCard rows={payouts} filter={match} term={term} pageSize={6} noun="payouts"
        tabs={[{ id: "all", label: "All", match: () => true }, { id: "sched", label: "Scheduled", match: (row) => row.status === "Scheduled" }, { id: "paid", label: "Paid", match: (row) => row.status === "Paid" }, { id: "hold", label: "On hold", match: (row) => row.status === "On hold" }, { id: "failed", label: "Failed", match: (row) => row.status === "Failed" }]}
        head={<tr><th>Restaurant</th><th>Period</th><th className="td-num">Orders</th><th className="td-num">Amount</th><th>Bank account</th><th>Status</th></tr>}
        render={(row) => (
          <tr key={row.id}>
            <td><div className="td-contact"><strong>{row.restaurant}</strong><small>{row.station}</small></div></td>
            <td className="td-muted">{row.period}</td><td className="td-num td-muted">{row.orders}</td>
            <td className="td-num"><strong>{rupees(row.amount)}</strong></td><td className="td-muted">{row.bank}</td>
            <td><Status status={row.status} note={row.note} /></td>
          </tr>
        )} />
    </Frame>
  );
}

/* ------------------------------------------------------------- settlements */

export function SettlementsScreen() {
  return (
    <Frame intro="Money moved by the payment gateway to the Train Dabba bank account"
      onExport={() => downloadCsv("settlements.csv", ["Settlement", "Date", "Payments", "Gross", "Fees", "Net to bank", "Bank reference", "Status"], settlements.map((row) => [row.id, row.date, row.payments, row.gross, row.fees, row.gross - row.fees, row.bankRef, row.status]))}
      tiles={[
        { label: "Settled to bank", value: "₹6,94,800", note: "this period" },
        { label: "In transit", value: "₹1,21,660", note: "arrives by 13 Nov" },
        { label: "Gateway fees", value: "₹16,420", note: "2.36% of collected" },
        { label: "Bank account", value: "HDFC ••2201", note: "Train Dabba current account" },
      ]}>
      <ListCard rows={settlements} term="" pageSize={5} noun="settlements"
        tabs={[{ id: "all", label: "All", match: () => true }, { id: "settled", label: "Settled", match: (row) => row.status === "Settled" }, { id: "transit", label: "In transit", match: (row) => row.status === "In transit" }]}
        head={<tr><th>Settlement</th><th className="td-num">Payments</th><th className="td-num">Gross</th><th className="td-num">Fees</th><th className="td-num">Net to bank</th><th>Bank reference</th><th>Status</th></tr>}
        render={(row) => (
          <tr key={row.id}>
            <td><div className="td-contact"><span className="td-pay-id">{row.id}</span><small>{row.date}</small></div></td>
            <td className="td-num td-muted">{row.payments}</td><td className="td-num td-muted">{rupees(row.gross)}</td><td className="td-num td-an-neg">−{rupees(row.fees)}</td>
            <td className="td-num"><strong>{rupees(row.gross - row.fees)}</strong></td><td className="td-muted">{row.bankRef}</td><td><Status status={row.status} /></td>
          </tr>
        )} />
    </Frame>
  );
}

/* ----------------------------------------------------------------- refunds */

export function RefundsScreen() {
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("all");
  const term = search.trim().toLowerCase();
  const match = (row: Refund) => includes(term, [row.id, row.order, row.customer]) && (reason === "all" || row.reason === reason);
  return (
    <Frame search={search} onSearch={setSearch} searchPlaceholder="Search refund, order or customer"
      extra={<label className="td-select"><select value={reason} onChange={(event) => setReason(event.target.value)} aria-label="Reason"><option value="all">All reasons</option>{REFUND_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      onExport={() => downloadCsv("refunds.csv", ["Refund", "Requested", "Order", "Customer", "Reason", "Amount", "Back to", "Status"], refunds.filter(match).map((row) => [row.id, row.requested, row.order, row.customer, row.reason, row.amount, row.backTo, row.status]))}
      tiles={[
        { label: "Refunded", value: "₹12,420", note: "86 refunds processed" },
        { label: "In process", value: "₹1,940", note: "7 refunds · 5–7 working days" },
        { label: "Failed", value: "₹349", note: "1 refund · retry needed" },
        { label: "Refund rate", value: "1.6%", note: "of collected amount" },
      ]}>
      <ListCard rows={refunds} filter={match} term={term} pageSize={5} noun="refunds"
        tabs={[{ id: "all", label: "All", match: () => true }, { id: "processed", label: "Processed", match: (row) => row.status === "Processed" }, { id: "initiated", label: "Initiated", match: (row) => row.status === "Initiated" }, { id: "failed", label: "Failed", match: (row) => row.status === "Failed" }]}
        head={<tr><th>Refund</th><th>Order · Customer</th><th>Reason</th><th className="td-num">Amount</th><th>Back to</th><th>Status</th></tr>}
        render={(row) => (
          <tr key={row.id}>
            <td><div className="td-contact"><span className="td-pay-id">{row.id}</span><small>Requested {row.requested}</small></div></td>
            <td><div className="td-contact"><span>{row.order}</span><small>{row.customer}</small></div></td>
            <td className="td-muted">{row.reason}</td><td className="td-num"><strong>{rupees(row.amount)}</strong></td>
            <td className="td-muted">{row.backTo}</td><td><Status status={row.status} /></td>
          </tr>
        )} />
    </Frame>
  );
}
