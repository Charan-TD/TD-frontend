"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { Icon } from "../components/Icon";
import { ListPagination } from "../components/ListPagination";
import { StatusTabs } from "../components/StatusTabs";
import { ListToolbar } from "../components/ListToolbar";
import { ChartRangeSelect, type ChartRange } from "../components/ChartRangeSelect";
import { ManagementStatus } from "../components/ManagementStatus";
import { ManagementActionButton } from "../components/ManagementActionButton";
import { TrendChart, type DayPoint } from "./DashboardView";

type Tab = "transactions" | "payouts" | "settlements" | "refunds";
type PaymentRecord = {
  id: string; date: string; restaurant: string; amount: number; status: string;
  order?: string; customer?: string; method?: string; transaction?: string;
  settlement?: string; bank?: string; reference?: string; orders?: number;
  gross?: number; deductions?: number; reason?: string; period?: string;
};
type Column = { label: string; value: (record: PaymentRecord) => string };
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const sum = (rows: PaymentRecord[]) => rows.reduce((total, row) => total + row.amount, 0);
const initialEnd = "2026-10-28";
// Fixed preview reference date keeps the range selector useful with sample data.
function rangeStart(range: ChartRange) {
  const date = new Date(`${initialEnd}T12:00:00Z`);
  if (range === "6m") date.setUTCMonth(date.getUTCMonth() - 5, 1);
  else date.setUTCDate(date.getUTCDate() - (range === "7d" ? 6 : 29));
  return date.toISOString().slice(0, 10);
}
const tabs: { id: Tab; label: string; section: string; description: string }[] = [
  { id: "transactions", label: "Transactions", section: "sales-all", description: "Track customer payment attempts and successful order collections." },
  { id: "payouts", label: "Payouts", section: "sales-payouts", description: "Verify scheduled and completed transfers to restaurant bank accounts." },
  { id: "settlements", label: "Settlements", section: "sales-settlements", description: "Review restaurant dues after commission and other deductions." },
  { id: "refunds", label: "Refunds", section: "sales-refunds", description: "Track returns to customers through their original payment method." },
];
// Illustrative records only. Settlement rules and amounts are not production policy.
const samples: Record<Tab, PaymentRecord[]> = {
  transactions: [
    { id: "TRX10234", order: "TD10234", date: "2026-10-27", customer: "Aarav S.", restaurant: "Coastal Spice Kitchen", amount: 500, method: "UPI", status: "Successful" },
    { id: "TRX10233", order: "TD10233", date: "2026-10-26", customer: "Priya R.", restaurant: "Tandoori Nights Grill", amount: 320, method: "UPI", status: "Successful" },
    { id: "TRX10232", order: "TD10232", date: "2026-10-25", customer: "Rahul K.", restaurant: "Chicken Dhaba", amount: 620, method: "Credit card", status: "Successful" },
    { id: "TRX10231", order: "TD10231", date: "2026-10-24", customer: "Neha P.", restaurant: "Boggu Restaurant", amount: 280, method: "UPI", status: "Failed" },
    { id: "TRX10230", order: "TD10230", date: "2026-10-23", customer: "Arjun M.", restaurant: "ABC Restaurant", amount: 510, method: "Wallet", status: "Successful" },
    { id: "TRX10229", order: "TD10229", date: "2026-10-22", customer: "Sneha V.", restaurant: "Silver Dum Biryani", amount: 690, method: "Net banking", status: "Successful" },
    { id: "TRX10228", order: "TD10228", date: "2026-10-21", customer: "Vikram N.", restaurant: "Train Dhaba Express", amount: 380, method: "UPI", status: "Successful" },
    { id: "TRX10227", order: "TD10227", date: "2026-10-20", customer: "Meera D.", restaurant: "Vivaha Bhojanambu", amount: 410, method: "Credit card", status: "Pending" },
    { id: "TRX10226", order: "TD10226", date: "2026-10-19", customer: "Rohan T.", restaurant: "Coastal Spice Kitchen", amount: 850, method: "UPI", status: "Successful" },
  ],
  payouts: [
    { id: "PAY1026", settlement: "SET1026", date: "2026-10-28", restaurant: "Coastal Spice Kitchen", amount: 450, bank: "HDFC •••• 4821", status: "Scheduled" },
    { id: "PAY1025", settlement: "SET1025", date: "2026-10-26", restaurant: "Tandoori Nights Grill", amount: 5643, bank: "ICICI •••• 9072", status: "Processing" },
    { id: "PAY1024", settlement: "SET1024", date: "2026-10-25", restaurant: "Train Dhaba Express", amount: 12825, bank: "SBI •••• 6310", status: "Completed", reference: "UTR202610250124" },
    { id: "PAY1023", settlement: "SET1023", date: "2026-10-24", restaurant: "Silver Dum Biryani", amount: 4320, bank: "Axis •••• 1164", status: "Failed" },
    { id: "PAY1022", settlement: "SET1022", date: "2026-10-27", restaurant: "ABC Restaurant", amount: 7776, bank: "SBI •••• 3089", status: "Pending" },
  ],
  settlements: [
    { id: "SET1026", date: "2026-10-27", period: "27 Oct 2026", restaurant: "Coastal Spice Kitchen", orders: 1, gross: 500, deductions: 50, amount: 450, status: "Due" },
    { id: "SET1025", date: "2026-10-26", period: "20–26 Oct 2026", restaurant: "Tandoori Nights Grill", orders: 14, gross: 6270, deductions: 627, amount: 5643, status: "Processing" },
    { id: "SET1024", date: "2026-10-25", period: "19–25 Oct 2026", restaurant: "Train Dhaba Express", orders: 32, gross: 14250, deductions: 1425, amount: 12825, status: "Completed" },
    { id: "SET1023", date: "2026-10-24", period: "18–24 Oct 2026", restaurant: "Silver Dum Biryani", orders: 12, gross: 4800, deductions: 480, amount: 4320, status: "Due" },
    { id: "SET1022", date: "2026-10-27", period: "21–27 Oct 2026", restaurant: "ABC Restaurant", orders: 18, gross: 8640, deductions: 864, amount: 7776, status: "Due" },
  ],
  refunds: [
    { id: "REF1023", transaction: "TRX10229", order: "TD10229", date: "2026-10-23", restaurant: "Silver Dum Biryani", amount: 690, method: "Net banking", reason: "Eligible order cancellation", status: "Completed", reference: "RFD202610230123" },
    { id: "REF1022", transaction: "TRX10230", order: "TD10230", date: "2026-10-24", restaurant: "ABC Restaurant", amount: 150, method: "Wallet", reason: "Missing item · partial refund", status: "Processing" },
    { id: "REF1021", transaction: "TRX10232", order: "TD10232", date: "2026-10-26", restaurant: "Chicken Dhaba", amount: 200, method: "Credit card", reason: "Item quality · partial refund", status: "Pending" },
    { id: "REF1020", transaction: "TRX10226", order: "TD10226", date: "2026-10-27", restaurant: "Coastal Spice Kitchen", amount: 100, method: "UPI", reason: "Missing item · partial refund", status: "Failed" },
  ],
};
const idColumn = (label: string): Column => ({ label, value: (r) => r.id });
const restaurant: Column = { label: "Restaurant", value: (r) => r.restaurant };
const dateColumn = (label: string): Column => ({ label, value: (r) => dateLabel(r.date) });
const amountColumn = (label: string): Column => ({ label, value: (r) => money(r.amount) });
const statusColumn = (label: string): Column => ({ label, value: (r) => r.status });
const columns: Record<Tab, Column[]> = {
  transactions: [idColumn("Transaction ID"), { label: "Order ID", value: (r) => `#${r.order}` }, dateColumn("Payment date"), { label: "Customer", value: (r) => r.customer ?? "—" }, restaurant, amountColumn("Payment amount"), { label: "Payment method", value: (r) => r.method ?? "—" }, statusColumn("Payment status")],
  payouts: [idColumn("Payout ID"), restaurant, { label: "Settlement ID", value: (r) => r.settlement ?? "—" }, { label: "Bank account", value: (r) => r.bank ?? "—" }, dateColumn("Transfer / scheduled date"), amountColumn("Net amount"), statusColumn("Transfer status")],
  settlements: [idColumn("Settlement ID"), restaurant, { label: "Settlement period", value: (r) => r.period ?? "—" }, { label: "Orders", value: (r) => String(r.orders) }, { label: "Gross amount", value: (r) => money(r.gross ?? 0) }, { label: "Deductions", value: (r) => money(r.deductions ?? 0) }, amountColumn("Net payable"), statusColumn("Settlement status")],
  refunds: [idColumn("Refund ID"), { label: "Order ID", value: (r) => `#${r.order}` }, { label: "Original transaction", value: (r) => r.transaction ?? "—" }, restaurant, dateColumn("Requested date"), amountColumn("Refund amount"), { label: "Return method", value: (r) => r.method ?? "—" }, { label: "Reason", value: (r) => r.reason ?? "—" }, statusColumn("Refund status")],
};
const dateNames: Record<Tab, string> = { transactions: "Payment date", payouts: "Transfer / scheduled date", settlements: "Settlement date", refunds: "Refund request date" };

type OperationalDetails = {
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  scheduledAt?: string;
  gatewayId?: string;
  failureCode?: string;
  failureReason?: string;
};
// Synthetic timestamps and provider IDs belong only to these preview fixtures.
const operationalDetails = Object.fromEntries(
  Object.entries(samples).flatMap(([kind, records]) => records.map((r) => {
    const scheduled = r.status === "Scheduled";
    const createdDate = scheduled ? "2026-10-27" : r.date;
    const completed = r.status === "Successful" || r.status === "Completed";
    const details: OperationalDetails = {
      createdAt: `${createdDate}T09:00:00+05:30`,
      updatedAt: `${createdDate}T09:05:00+05:30`,
      ...(completed ? { completedAt: `${r.date}T09:05:00+05:30` } : {}),
      ...(scheduled ? { scheduledAt: `${r.date}T10:00:00+05:30` } : {}),
      ...(kind !== "settlements" && r.status !== "Scheduled" && r.status !== "Pending"
        ? { gatewayId: `sample_${kind === "transactions" ? "pay" : kind === "refunds" ? "rfnd" : "transfer"}_${r.id.toLowerCase()}` } : {}),
    };
    return [r.id, details];
  })),
) as Record<string, OperationalDetails>;
Object.assign(operationalDetails.TRX10231, { failureCode: "PAYMENT_DECLINED", failureReason: "The issuing bank declined this payment. No successful collection was recorded." });
Object.assign(operationalDetails.PAY1023, { failureCode: "BENEFICIARY_REJECTED", failureReason: "The receiving bank rejected the beneficiary account. Verify the restaurant's bank details before retrying." });
Object.assign(operationalDetails.REF1020, { failureCode: "REFUND_PROCESSING_ERROR", failureReason: "The gateway could not process the refund. Check the gateway status before submitting another refund." });
const timestamp = (value?: string) => value ? `${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(value))} IST` : "Not recorded";

function PaymentDetails({ record, kind }: { record: PaymentRecord; kind: Tab }) {
  const details = operationalDetails[record.id];
  const original = kind === "refunds" ? samples.transactions.find((r) => r.id === record.transaction) : undefined;
  const settlement = kind === "payouts" ? samples.settlements.find((r) => r.id === record.settlement) : kind === "settlements" ? record : undefined;
  const payouts = kind === "settlements" ? samples.payouts.filter((r) => r.settlement === record.id) : [];
  const relatedRefunds = samples.refunds.filter((r) => r.transaction === (original?.id ?? record.id));
  const completedRefunds = sum(relatedRefunds.filter((r) => r.status === "Completed"));
  const activeRefunds = sum(relatedRefunds.filter((r) => r.status === "Pending" || r.status === "Processing"));
  const groups: { title: string; rows: [string, string][] }[] = [
    { title: "Record overview", rows: columns[kind].map((c) => [c.label, c.value(record)]) },
  ];
  if (kind !== "settlements") groups.push({ title: "Provider references", rows: [
    [kind === "payouts" ? "Transfer provider ID" : kind === "refunds" ? "Gateway refund ID" : "Gateway payment ID", details.gatewayId ?? "Not assigned yet"],
    [kind === "payouts" ? "Bank reference / UTR" : kind === "refunds" ? "Refund reference / ARN" : "Bank / gateway reference", record.reference ?? (record.status === "Failed" ? "No confirmed reference" : "Not available in sample")],
    ...(original ? [["Original gateway payment ID", operationalDetails[original.id].gatewayId ?? "Not recorded"] as [string, string]] : []),
  ] });
  if (settlement) groups.push({ title: "Settlement calculation", rows: [
    ["Gross order amount", money(settlement.gross ?? 0)],
    ["Commission (illustrative)", money(settlement.deductions ?? 0)],
    ["Other fees / tax adjustments (sample)", money(0)],
    ["Net restaurant payable", money(settlement.amount)],
    ["Calculation", `${money(settlement.gross ?? 0)} − ${money(settlement.deductions ?? 0)} = ${money(settlement.amount)}`],
    ...(kind === "payouts" ? [["Transfer amount", money(record.amount)] as [string, string]] : payouts.map((r): [string, string] => ["Linked payout", `${r.id} · ${r.status} · ${money(r.amount)}`])),
  ] });
  if (kind === "transactions" || kind === "refunds") {
    const payment = original ?? (kind === "transactions" ? record : undefined);
    groups.push({ title: "Customer payment breakdown", rows: [
      ["Original payment amount", payment ? money(payment.amount) : "Not recorded"],
      ["Successfully collected", payment ? money(payment.status === "Successful" ? payment.amount : 0) : "Not recorded"],
      ["Completed refunds", money(completedRefunds)],
      ["Pending / processing refunds", money(activeRefunds)],
      ["Collected amount after completed refunds", payment ? money((payment.status === "Successful" ? payment.amount : 0) - completedRefunds) : "Not recorded"],
      ...(kind === "refunds" ? [["This refund request", money(record.amount)], ["Refund type", original ? record.amount === original.amount ? "Full refund" : "Partial refund" : "Not recorded"], ["Return destination", `Original payment method · ${record.method}`]] as [string, string][] : relatedRefunds.map((r): [string, string] => [`Linked refund ${r.id}`, `${money(r.amount)} · ${r.status}`])),
    ] });
  }
  groups.push({ title: "Timeline", rows: [
    [kind === "refunds" ? "Requested at" : "Created at", timestamp(details.createdAt)],
    ["Last status update", timestamp(details.updatedAt)],
    ...(details.scheduledAt ? [["Scheduled transfer", timestamp(details.scheduledAt)] as [string, string]] : []),
    ...(details.completedAt ? [["Completed at", timestamp(details.completedAt)] as [string, string]] : []),
    ...(record.status === "Failed" ? [["Failed at", timestamp(details.updatedAt)] as [string, string]] : []),
  ] });
  return <div className="payments-detail-sections">
    <p className="payments-details-disclosure">Illustrative record, provider references and timestamps. Financial rules are sample assumptions.</p>
    {record.status === "Failed" && <section className="payments-failure-details" aria-label="Failure information"><h3>Failure reason</h3><p>{details.failureReason ?? "No failure reason was recorded."}</p><code>{details.failureCode ?? "Code unavailable"}</code></section>}
    {groups.map((group) => <section key={group.title}><h3>{group.title}</h3><dl className="payments-details">{group.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}
  </div>;
}

export function PaymentsView({ subsection, onSelectSubsection }: { subsection: string; onSelectSubsection: (section: string) => void }) {
  const tab = tabs.find((item) => item.section === subsection) ?? tabs[0];
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState<ChartRange>("30d");
  const start = rangeStart(range);
  const end = initialEnd;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
  const source = samples[tab.id];
  const invalidDates = !start || !end || start > end;
  const records = source.filter((r) => !invalidDates && r.date >= start && r.date <= end && (method === "all" || r.method === method) && (status === "all" || r.status === status) && Object.values(r).some((value) => String(value).toLowerCase().includes(search.trim().toLowerCase())));
  const withStatus = (...values: string[]) => records.filter((r) => values.includes(r.status));
  const successful = withStatus("Successful");
  const reset = () => { setMethod("all"); setStatus("all"); setRange("30d"); setSearch(""); setPage(1); };
  const metrics: { label: string; value: string; detail: string; tone: string }[] = tab.id === "transactions" ? [
    { label: "Payment attempts", value: String(records.length), detail: "Count of attempts, not revenue", tone: "total" },
    { label: "Successful collections", value: money(sum(successful)), detail: `${successful.length} successful payments · before refunds`, tone: "success" },
    { label: "Failed attempts", value: String(withStatus("Failed").length), detail: `${money(sum(withStatus("Failed")))} attempted · not collected`, tone: "failed" },
    { label: "Pending payments", value: money(sum(withStatus("Pending"))), detail: "Awaiting confirmation · not collected", tone: "pending" },
  ] : tab.id === "payouts" ? [
    { label: "Transferred", value: money(sum(withStatus("Completed"))), detail: "Completed bank transfers", tone: "success" },
    { label: "In progress", value: money(sum(withStatus("Scheduled", "Pending", "Processing"))), detail: "Scheduled, pending and processing payouts", tone: "pending" },
    { label: "Failed transfers", value: money(sum(withStatus("Failed"))), detail: "Review transfer details", tone: "failed" },
  ] : tab.id === "settlements" ? [
    { label: "Restaurant dues", value: money(sum(withStatus("Due"))), detail: "Net payable awaiting processing", tone: "total" },
    { label: "Processing", value: money(sum(withStatus("Processing"))), detail: "Settlements being processed", tone: "pending" },
    { label: "Completed", value: money(sum(withStatus("Completed"))), detail: "Finalized settlement amounts", tone: "success" },
  ] : [
    { label: "Returned to customers", value: money(sum(withStatus("Completed"))), detail: "Completed refunds", tone: "success" },
    { label: "In progress", value: money(sum(withStatus("Pending", "Processing"))), detail: "Pending and processing refunds", tone: "pending" },
    { label: "Failed refunds", value: money(sum(withStatus("Failed"))), detail: "Review refund details", tone: "failed" },
  ];
  // Group by month for long ranges; short ranges include zero-collection days.
  const days: DayPoint[] = [];
  if (!invalidDates && tab.id === "transactions") {
    const monthly = (Date.parse(end) - Date.parse(start)) / 86400000 > 62;
    const cursor = new Date(`${start}T12:00:00Z`);
    if (monthly) cursor.setUTCDate(1);
    while (cursor.toISOString().slice(0, 10) <= end && days.length < 1200) {
      const key = cursor.toISOString().slice(0, monthly ? 7 : 10);
      const matches = successful.filter((r) => r.date.startsWith(key));
      days.push({ key, label: cursor.toLocaleDateString("en-IN", { timeZone: "UTC", month: "short", ...(monthly ? { year: "2-digit" as const } : { day: "numeric" as const }) }), full: monthly ? key : dateLabel(key), orders: matches.length, revenue: sum(matches) });
      if (monthly) cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      else cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const exportRecords = () => {
    const rows = [["SAMPLE DATA — not live financial records"], columns[tab.id].map((c) => c.label), ...records.map((r) => columns[tab.id].map((c) => c.value(r)))];
    const csv = rows.map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `sample-${tab.id}-${start}-${end}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const activeColumns = columns[tab.id];
  const currentPage = Math.min(page, Math.max(1, Math.ceil(records.length / 8)));
  return (
    <section className="user-management-workspace payments-module">
      <StatusTabs label="Payment sections" value={tab.section} tabs={tabs.map((item) => ({ id: item.section, label: item.label }))} onChange={(section) => { reset(); setSelected(null); onSelectSubsection(section); }} />
      <div className="payments-preview-notice"><Icon name="info" size={18} /><div><strong>Sample data · Live payments are not connected</strong><span>Illustrative records for 19–28 Oct 2026. Amounts and business rules are for preview only.</span></div></div>
      <div className="payments-section-intro"><div><h2>{tab.label}</h2><p>{tab.description}</p></div><span className="payments-scope-label">All totals follow the selected filters</span></div>
      <div className="payments-date-toolbar"><span>{dateNames[tab.id]}</span><ChartRangeSelect value={range} onChange={(value) => { setRange(value); setPage(1); }} /><span>{dateLabel(start)} – {dateLabel(end)}</span></div>
      {invalidDates && <p role="alert" className="payments-date-error">Choose a valid date range with the end date on or after the start date.</p>}
      <div className="payments-list-filters">
        <ListToolbar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={tab.id === "transactions" ? "Search payment, order, customer or restaurant" : tab.id === "refunds" ? "Search refund, order or restaurant" : "Search ID or restaurant"} label={tab.label.toLowerCase()} />
        {(tab.id === "transactions" || tab.id === "refunds") && <select aria-label={tab.id === "refunds" ? "Return method" : "Payment method"} value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}><option value="all">All {tab.id === "refunds" ? "return" : "payment"} methods</option>{Array.from(new Set(source.map((r) => r.method))).map((value) => <option key={value}>{value}</option>)}</select>}
        <select aria-label={`${tab.label} status`} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="all">All statuses</option>{Array.from(new Set(source.map((r) => r.status))).map((value) => <option key={value}>{value}</option>)}</select>

      </div>
      {tab.id === "transactions" && <article className="panel dash-panel transactions-chart"><header><div><h2>Successful payments over time</h2><p>Customer collections in INR · before refunds · sample data</p></div><span className="payments-chart-total">{money(sum(successful))}<small>{successful.length} successful payments</small></span></header>{days.length > 0 ? <TrendChart days={days} mode="revenue" subject="payments" /> : <div className="payments-empty">Choose a valid date range to view collections.</div>}<p className="payments-chart-caption">Failed and pending attempts are excluded. Completed refunds are tracked separately in Refunds.</p></article>}
      <section className={`payments-metrics${metrics.length === 3 ? " payments-metrics--three" : ""}`} aria-label={`${tab.label} summary`}>{metrics.map((m) => <article key={m.label} className="dash-group"><div className="dash-stat"><span className="dash-card-icon" aria-hidden="true"><Icon name={m.tone === "success" ? "check" : m.tone === "failed" ? "info" : "wallet"} size={24} /></span><span className="dash-stat-text"><b>{m.label}</b><span className="dash-stat-caption">{m.detail}</span></span><strong className="dash-stat-value">{m.value}</strong></div></article>)}</section>
      {tab.id === "settlements" && <article className="panel payments-settlement-overview"><header><h2>Settlement amounts by status</h2><p>A settlement calculates restaurant dues; a payout transfers money. One payout may combine multiple settlements.</p></header>{["Completed", "Processing", "Due"].map((value) => { const amount = sum(withStatus(value)); return <div className="payments-breakdown" key={value}><span>{value}</span><div className="payments-breakdown-track"><span className={`payments-breakdown-fill payments-breakdown-fill--${value.toLowerCase()}`} style={{ width: `${sum(records) ? amount / sum(records) * 100 : 0}%` }} /></div><strong>{money(amount)}</strong></div>; })}<p className="payments-chart-caption">Sample deductions are illustrative. Actual fees, taxes, commission and refund liabilities depend on business rules.</p></article>}
      <article className="payments-directory"><header><div><h2>{tab.label} <span className="payments-record-count">{records.length}</span></h2><p className="payments-chart-caption">{!invalidDates ? `${dateLabel(start)} – ${dateLabel(end)}` : "Invalid date range"}</p></div><button type="button" className="secondary-button" onClick={exportRecords} disabled={!records.length}><Icon name="file" size={15} />Export sample CSV</button></header>
        <div className="user-table-wrap"><table className="user-table"><caption className="payments-visually-hidden">Sample {tab.label.toLowerCase()} matching the selected filters</caption><thead><tr>{activeColumns.map((c) => <th scope="col" key={c.label}>{c.label}</th>)}<th scope="col">Details</th></tr></thead><tbody>{records.slice((currentPage - 1) * 8, currentPage * 8).map((r) => <tr key={r.id}>{activeColumns.map((c) => <td key={c.label}>{c.label.endsWith("status") ? <ManagementStatus status={r.status} /> : c.value(r)}</td>)}<td><ManagementActionButton action="view" ariaLabel={`View ${r.id} details`} onClick={() => setSelected(r)} /></td></tr>)}</tbody></table></div>
        {!records.length && <div className="payments-empty"><h3>No {tab.label.toLowerCase()} found</h3><p>Try a different search, status or date range.</p></div>}
        <footer><span className="transactions-sample-label">Sample records only · {records.length ? `${(currentPage - 1) * 8 + 1}–${Math.min(currentPage * 8, records.length)} of ${records.length}` : "0 records"}</span>{records.length > 0 && <ListPagination page={currentPage} count={Math.ceil(records.length / 8)} onChange={setPage} />}</footer>
      </article>
      <Dialog open={selected !== null} onClose={() => setSelected(null)} fullWidth maxWidth="sm" aria-labelledby="payment-details-title"><DialogTitle id="payment-details-title">{tab.label === "Transactions" ? "Payment" : tab.label.slice(0, -1)} details<small className="payments-dialog-preview">Sample record · not live</small></DialogTitle><DialogContent>{selected && <PaymentDetails record={selected} kind={tab.id} />}</DialogContent><DialogActions><button type="button" className="secondary-button" onClick={() => setSelected(null)}>Close</button></DialogActions></Dialog>
    </section>
  );
}
