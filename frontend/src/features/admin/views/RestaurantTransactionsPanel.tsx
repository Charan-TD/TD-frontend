"use client";

import { useState } from "react";

import { Icon } from "../components/Icon";
import { PageFooter } from "../components/PageFooter";
import { StatusTabs } from "../components/StatusTabs";

/**
 * There is no per-restaurant transactions endpoint yet, so this tab shows sample rows built
 * here. When the API exists, replace `sampleTransactions` and the summary tiles with a query.
 */
type Kind = "Order" | "Payout" | "Refund" | "Commission";
type Status = "Completed" | "Paid" | "Pending" | "Failed";
type Transaction = { id: string; date: string; kind: Kind; details: string; amount: number; status: Status; monthsAgo: number };

const PAGE_SIZE = 10;
const MONTHS = ["Nov", "Oct", "Sep"];

const template: { day: number; time?: string; kind: Kind; prefix: string; details: string; amount: number; status: Status }[] = [
  { day: 15, kind: "Payout", prefix: "PAY", details: "To SBI ••4821 · scheduled", amount: -24262, status: "Pending" },
  { day: 11, time: "1:42 PM", kind: "Order", prefix: "TXN", details: "Order #TD-50418 · 2 items", amount: 498, status: "Completed" },
  { day: 11, time: "12:10 PM", kind: "Order", prefix: "TXN", details: "Order #TD-50409 · 1 item", amount: 249, status: "Completed" },
  { day: 11, time: "11:05 AM", kind: "Refund", prefix: "TXN", details: "Order #TD-50377 · item not delivered", amount: -189, status: "Completed" },
  { day: 10, time: "8:30 PM", kind: "Order", prefix: "TXN", details: "Order #TD-50311 · 3 items", amount: 727, status: "Completed" },
  { day: 8, time: "10:00 AM", kind: "Payout", prefix: "PAY", details: "To SBI ••4821 · UTR 432918776510", amount: -46210, status: "Paid" },
  { day: 8, time: "9:58 AM", kind: "Commission", prefix: "TXN", details: "Platform fee · 1–7 Nov", amount: -8154, status: "Completed" },
  { day: 7, time: "9:14 PM", kind: "Order", prefix: "TXN", details: "Order #TD-50102 · 2 items", amount: 438, status: "Completed" },
  { day: 1, time: "10:00 AM", kind: "Payout", prefix: "PAY", details: "To SBI ••4821 · UTR 432811094377", amount: -43980, status: "Paid" },
  { day: 31, time: "3:20 PM", kind: "Payout", prefix: "PAY", details: "To SBI ••4821 · bank declined", amount: -12500, status: "Failed" },
];

const sampleTransactions: Transaction[] = [0, 1, 2].flatMap((monthsAgo) =>
  template.map((row, index) => ({
    id: `${row.prefix}-${(row.prefix === "PAY" ? 1044 : 88213) - monthsAgo * 41 - index * 7}`,
    date: `${row.day} ${MONTHS[monthsAgo + (row.day === 31 ? 1 : 0)] ?? "Aug"}${row.time ? `, ${row.time}` : ""}`,
    kind: row.kind,
    details: row.details,
    amount: row.amount,
    status: row.status,
    monthsAgo,
  })),
);

const money = (value: number) => `${value < 0 ? "−" : "+"}₹${Math.abs(value).toLocaleString("en-IN")}`;
const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const STATUS_CLASS: Record<Status, string> = { Completed: "is-ok", Paid: "is-ok", Pending: "is-warn", Failed: "is-bad" };

type KindFilter = "all" | "Order" | "Payout" | "Refund";
type Period = "0" | "1" | "2" | "all";

export function RestaurantTransactionsPanel() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [period, setPeriod] = useState<Period>("0");
  const [page, setPage] = useState(1);

  const term = search.trim().toLowerCase();
  const filtered = sampleTransactions
    .filter((row) => period === "all" || row.monthsAgo === Number(period))
    .filter((row) => kind === "all" || row.kind === kind)
    .filter((row) => !term || row.id.toLowerCase().includes(term) || row.details.toLowerCase().includes(term));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <>
      <div className="td-banner" role="note">
        <span className="td-banner-icon"><Icon name="help" size={15} /></span>
        <p><b>Sample data.</b> The transactions API isn&apos;t available yet, so these figures are placeholders.</p>
      </div>

      <div className="td-rd-tiles">
        <div><small>Total sales</small><strong>₹1,84,320</strong><span>412 orders this month</span></div>
        <div><small>Commission</small><strong>₹27,648</strong><span>15% of sales</span></div>
        <div><small>Paid out</small><strong>₹1,32,410</strong><span>3 payouts this month</span></div>
        <div><small>Next payout</small><strong>₹24,262</strong><span>On 15 Nov to SBI ••4821</span></div>
      </div>

      <div className="td-table-card">
        <div className="td-rd-menu-bar">
          <label className="td-rd-search">
            <Icon name="search" size={15} />
            <input type="search" placeholder="Search by order or transaction ID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} aria-label="Search transactions" />
          </label>
          <StatusTabs placement="inline" label="Filter transactions by type" value={kind} onChange={(value) => { setKind(value as KindFilter); setPage(1); }}
            tabs={[{ id: "all", label: "All" }, { id: "Order", label: "Orders" }, { id: "Payout", label: "Payouts" }, { id: "Refund", label: "Refunds" }]} />
          <label className="td-select">
            <select value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(1); }} aria-label="Period">
              <option value="0">This month</option>
              <option value="1">Last month</option>
              <option value="2">2 months ago</option>
              <option value="all">All time</option>
            </select>
          </label>
        </div>

        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Date</th><th>ID</th><th>Type</th><th>Details</th><th className="td-th-right">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.id}-${row.monthsAgo}`}>
                  <td className="td-muted">{row.date}</td>
                  <td className="td-muted">{row.id}</td>
                  <td><strong>{row.kind}</strong></td>
                  <td className="td-muted">{row.details}</td>
                  <td className="td-th-right"><b className={row.amount > 0 ? "td-rd-plus" : undefined}>{row.amount > 0 ? money(row.amount) : `−${rupees(Math.abs(row.amount))}`}</b></td>
                  <td><span className={`td-rd-dot ${STATUS_CLASS[row.status]}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="api-state">No transactions found.</div>}
        </div>
        {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun="transactions" onChange={setPage} />}
      </div>
    </>
  );
}
