"use client";

import type { ReactNode } from "react";

import { Icon } from "../../admin/components/Icon";
import { BarRows, COLORS, Histogram, LineChart } from "../charts";

/*
 * The four Analytics reports below show sample figures: there is no reporting API for them yet.
 * Replace the constants with query results when the endpoints exist; the layout takes plain arrays.
 */

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;
const days = Array.from({ length: 12 }, (_, i) => `${i + 1} Nov`);

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
}

type Tile = { label: string; value: string; note: string; tone?: "up" | "down" };

function Page({ intro, tiles, onDownload, children }: { intro: string; tiles: Tile[]; onDownload: () => void; children: ReactNode }) {
  const hint = "Sample data can't be filtered yet.";
  return (
    <section className="td-perf">
      <header className="td-perf-head td-perf-head--center">
        <p>{intro}</p>
        <div className="td-perf-filters">
          <label className="td-select"><select aria-label="Station" disabled data-tooltip={hint} defaultValue="all"><option value="all">All stations</option></select></label>
          <label className="td-select"><select aria-label="Date range" disabled data-tooltip={hint} defaultValue="range"><option value="range">1 – 12 Nov 2026</option></select></label>
          <button type="button" className="td-btn td-btn--primary" onClick={onDownload}><Icon name="download" size={14} />Download report</button>
        </div>
      </header>

      <div className="api-state" role="note">Sample data: this report isn&apos;t connected to the backend yet.</div>

      <div className="td-perf-tiles td-perf-tiles--four">
        {tiles.map((tile) => <div key={tile.label}><small>{tile.label}</small><strong>{tile.value}</strong><span className={tile.tone ? `td-an-${tile.tone}` : undefined}>{tile.note}</span></div>)}
      </div>
      {children}
    </section>
  );
}

function Card({ title, note, legend, children, className }: { title: string; note?: string; legend?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`td-perf-card${className ? ` ${className}` : ""}`}>
      <header className="td-an-card-head"><h3>{title}{note && <small>{note}</small>}</h3>{legend}</header>
      {children}
    </section>
  );
}

const Legend = ({ items }: { items: [string, string][] }) => (
  <ul className="td-an-legend">{items.map(([name, color]) => <li key={name}><i style={{ background: color }} />{name}</li>)}</ul>
);

/* ------------------------------------------------------------------ sales */

const gross = [38, 42, 40, 51, 47, 55, 62, 58, 49, 53, 60, 66].map((value) => value * 1000);
const salesOrders = [330, 360, 350, 440, 410, 473, 533, 498, 421, 455, 516, 567];
const salesDays = gross.map((value, i) => {
  const discounts = Math.round(value * 0.08), refunds = Math.round(value * 0.02);
  return { date: days[i], orders: salesOrders[i], gross: value, discounts, refunds, commission: Math.round(value * 0.15), net: value - discounts - refunds };
});

const SPLIT = [
  { name: "Restaurant payouts", amount: 465750, share: 75, color: COLORS.blue },
  { name: "Commission (ours)", amount: 93150, share: 15, color: COLORS.orange },
  { name: "Discounts", amount: 49680, share: 8, color: COLORS.purple },
  { name: "Refunds", amount: 12420, share: 2, color: COLORS.teal },
];
const SALES_BY_STATION = [["Secunderabad Jn", 196], ["Vijayawada Jn", 178], ["Hyderabad Deccan", 89], ["Warangal", 61], ["Kazipet Jn", 38], ["Mahim Jn", 19]] as const;

export function SalesAnalyticsView() {
  const table = salesDays.slice(-7).reverse();
  const kLabel = (value: number) => `₹${+(value / 1000).toFixed(1)}k`;
  return (
    <Page intro="Money earned from all orders" onDownload={() => downloadCsv("sales-report.csv", [["Date", "Orders", "Gross", "Discounts", "Refunds", "Commission", "Net sales"], ...salesDays.map((d) => [d.date, d.orders, d.gross, d.discounts, d.refunds, d.commission, d.net])])}
      tiles={[
        { label: "Gross sales", value: "₹6,21,000", note: "+12% vs last period", tone: "up" },
        { label: "Net sales", value: "₹5,59,000", note: "after discounts and refunds" },
        { label: "Commission earned", value: "₹93,150", note: "15% of gross sales" },
        { label: "Avg order value", value: "₹116", note: "−₹4 vs last period", tone: "down" },
      ]}>
      <Card title="Sales trend" note="Gross vs net, per day" legend={<Legend items={[["Gross", COLORS.teal], ["Net", COLORS.blue]]} />}>
        <LineChart labels={days} labelEvery={2} ticks={[0, 20000, 40000, 60000, 80000]} format={(v) => `₹${v / 1000}k`} height={190}
          series={[
            { name: "Gross", color: COLORS.teal, values: salesDays.map((d) => d.gross), endLabel: kLabel(salesDays[11].gross) },
            { name: "Net", color: COLORS.blue, values: salesDays.map((d) => d.net), endLabel: kLabel(salesDays[11].net) },
          ]} />
      </Card>

      <div className="td-an-pair">
        <Card title="Where the money goes" note="Gross sales ₹6,21,000 split">
          <div className="td-an-split" role="img" aria-label="Split of gross sales">
            {SPLIT.map((part) => <i key={part.name} style={{ width: `${part.share}%`, background: part.color }} />)}
          </div>
          <ul className="td-an-split-legend">
            {SPLIT.map((part) => (
              <li key={part.name}><span><i style={{ background: part.color }} />{part.name}</span><b>{rupees(part.amount)} <em>{part.share}%</em></b></li>
            ))}
          </ul>
        </Card>
        <Card title="Sales by station" note="Gross, this period">
          <BarRows labelWidth={110} rows={SALES_BY_STATION.map(([label, value]) => ({ label, value, text: `₹${value}k` }))} />
        </Card>
      </div>

      <div className="td-table-card">
        <div className="td-table-card-head"><h3>Day by day</h3></div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Date</th><th className="td-num">Orders</th><th className="td-num">Gross</th><th className="td-num">Discounts</th><th className="td-num">Refunds</th><th className="td-num">Commission</th><th className="td-num">Net sales</th></tr></thead>
            <tbody>
              {table.map((d) => (
                <tr key={d.date}>
                  <td><strong>{d.date}</strong></td><td className="td-num">{d.orders}</td><td className="td-num">{rupees(d.gross)}</td>
                  <td className="td-num td-an-neg">−{rupees(d.discounts)}</td><td className="td-num td-an-neg">−{rupees(d.refunds)}</td>
                  <td className="td-num">{rupees(d.commission)}</td><td className="td-num"><strong>{rupees(d.net)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}

/* ----------------------------------------------------------------- orders */

const JOURNEY = [
  { label: "Placed", count: 5368, share: "100.0%", drop: null, color: "#23977f" },
  { label: "Accepted", count: 5290, share: "98.5%", drop: "−78 from previous", color: "#3aa690" },
  { label: "Food ready", count: 5214, share: "97.1%", drop: "−76 from previous", color: "#62b9a8" },
  { label: "Delivered", count: 5128, share: "95.5%", drop: "−86 from previous", color: "#86c9bc" },
];
const BY_HOUR = [4, 19, 42, 36, 22, 30, 58, 61, 40, 26, 33, 52, 47, 38, 27, 20];
const HOUR_LABELS = Array.from({ length: 16 }, (_, i) => { const hour = 6 + i; return `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "p" : "a"}`; });
const CANCEL_REASONS = [["Train late / passenger not found", 48, 37], ["Restaurant could not prepare in time", 31, 24], ["Customer cancelled", 27, 21], ["Item out of stock", 14, 11], ["Payment failed", 9, 7]] as const;

export function OrdersAnalyticsView() {
  return (
    <Page intro="Order volume, delivery and cancellations" onDownload={() => downloadCsv("orders-report.csv", [["Reason", "Orders", "Share %"], ...CANCEL_REASONS.map(([reason, orders, share]) => [reason, orders, share])])}
      tiles={[
        { label: "Total orders", value: "5,368", note: "+9% vs last period", tone: "up" },
        { label: "Delivered", value: "5,128", note: "95.5% of orders" },
        { label: "Cancelled", value: "129", note: "2.4% · up 0.3%", tone: "down" },
        { label: "Group orders", value: "12", note: "1,960 meals" },
      ]}>
      <div className="td-an-pair td-an-pair--even">
        <Card title="Order journey" note="Where orders drop off">
          <ul className="td-an-journey">
            {JOURNEY.map((step) => (
              <li key={step.label}>
                <span>{step.label}</span>
                <i><u style={{ width: `${(step.count / JOURNEY[0].count) * 100}%`, background: step.color }} /></i>
                <b>{step.count.toLocaleString("en-IN")} · {step.share}{step.drop && <small>{step.drop}</small>}</b>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Orders by hour" note="Today, all stations">
          <LineChart labels={HOUR_LABELS} labelEvery={2} ticks={[0, 20, 40, 60, 80]} format={String} height={160}
            series={[{ name: "Orders", color: COLORS.teal, values: BY_HOUR, area: true, endLabel: String(BY_HOUR[BY_HOUR.length - 1]) }]} />
        </Card>
      </div>

      <div className="td-table-card">
        <div className="td-table-card-head"><h3>Why orders were cancelled</h3></div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Reason</th><th className="td-num">Orders</th><th>Share</th></tr></thead>
            <tbody>
              {CANCEL_REASONS.map(([reason, orders, share]) => (
                <tr key={reason}>
                  <td>{reason}</td><td className="td-num">{orders}</td>
                  <td><div className="td-an-share"><i><u style={{ width: `${share * 2.6}%` }} /></i><span>{share}%</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ users */

const RETURNING = [640, 690, 675, 760, 750, 800, 835, 815, 865, 885, 900, 912];
const NEW = [310, 345, 300, 380, 405, 390, 430, 460, 430, 470, 490, 512];
const REPEAT_BY_STATION = [["Vijayawada Jn", 45], ["Secunderabad Jn", 42], ["Hyderabad Deccan", 38], ["Warangal", 36], ["Kazipet Jn", 33]] as const;
const ORDER_FREQUENCY = [{ label: "1", value: 59, text: "59%" }, { label: "2", value: 21, text: "21%" }, { label: "3–4", value: 12, text: "12%" }, { label: "5–9", value: 6, text: "6%" }, { label: "10+", value: 2, text: "2%" }];
const USERS_BY_STATION = [
  ["Secunderabad Junction", 1240, 4880, 42, 2.6], ["Vijayawada Junction", 1105, 4310, 45, 2.8], ["Hyderabad Deccan", 612, 2140, 38, 2.2], ["Warangal", 388, 1320, 36, 2.0], ["Kazipet Junction", 214, 790, 33, 1.9],
] as const;

export function UsersAnalyticsView() {
  return (
    <Page intro="Who is ordering and how often they come back" onDownload={() => downloadCsv("users-report.csv", [["Station", "New", "Active", "Repeat rate %", "Orders per customer"], ...USERS_BY_STATION.map((row) => [...row])])}
      tiles={[
        { label: "New customers", value: "4,891", note: "+14% vs last period", tone: "up" },
        { label: "Active customers", value: "18,240", note: "ordered at least once" },
        { label: "Repeat customers", value: "41%", note: "ordered 2+ times" },
        { label: "Orders per customer", value: "2.4", note: "this period" },
      ]}>
      <Card title="New vs returning customers" note="Customers who ordered each day" legend={<Legend items={[["Returning", COLORS.blue], ["New", COLORS.teal]]} />}>
        <LineChart labels={days} labelEvery={2} ticks={[0, 250, 500, 750, 1000]} format={String} height={190}
          series={[
            { name: "Returning", color: COLORS.blue, values: RETURNING, endLabel: String(RETURNING[11]) },
            { name: "New", color: COLORS.teal, values: NEW, endLabel: String(NEW[11]) },
          ]} />
      </Card>

      <div className="td-an-pair td-an-pair--even">
        <Card title="Repeat rate by station" note="% of customers who ordered 2+ times">
          <BarRows labelWidth={118} rows={REPEAT_BY_STATION.map(([label, value]) => ({ label, value, text: `${value}%` }))} />
        </Card>
        <Card title="How often customers order" note="Customers by number of orders">
          <Histogram items={ORDER_FREQUENCY} />
        </Card>
      </div>

      <div className="td-table-card">
        <div className="td-table-card-head"><h3>By station</h3></div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Station</th><th className="td-num">New</th><th className="td-num">Active</th><th className="td-num">Repeat rate</th><th className="td-num">Orders per customer</th></tr></thead>
            <tbody>
              {USERS_BY_STATION.map(([station, fresh, active, repeat, perCustomer]) => (
                <tr key={station}>
                  <td>{station}</td><td className="td-num">{fresh.toLocaleString("en-IN")}</td><td className="td-num">{active.toLocaleString("en-IN")}</td>
                  <td className="td-num"><strong>{repeat}%</strong></td><td className="td-num td-muted">{perCustomer.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------- operations */

const ON_TIME = [91, 92, 95, 93, 89, 96, 94, 92, 94, 96, 93, 94];
const PREP_TIME = [{ label: "<10", value: 18, text: "18%" }, { label: "10–15", value: 36, text: "36%" }, { label: "15–20", value: 28, text: "28%" }, { label: "20–25", value: 12, text: "12%" }, { label: "25+", value: 6, text: "6%" }];
const RESTAURANTS = [
  { name: "silver dum biryani", station: "Vijayawada Junction", orders: 842, accepted: 98, prep: 14, onTime: 97, complaints: 3 },
  { name: "Paradise Station Cafe", station: "Secunderabad Junction", orders: 768, accepted: 96, prep: 17, onTime: 94, complaints: 5 },
  { name: "traindhaba cloud kitchen", station: "Secunderabad Junction", orders: 612, accepted: 99, prep: 12, onTime: 98, complaints: 1 },
  { name: "Hotel Kakatiya", station: "Warangal", orders: 344, accepted: 91, prep: 22, onTime: 88, complaints: 9 },
  { name: "Annapurna Meals", station: "Kazipet Junction", orders: 210, accepted: 86, prep: 26, onTime: 82, complaints: 12 },
  { name: "Chicken Dhaba", station: "Hyderabad Deccan", orders: 188, accepted: 94, prep: 19, onTime: 91, complaints: 4 },
];

export function OperationsAnalyticsView() {
  return (
    <Page intro="How well restaurants and deliveries are running" onDownload={() => downloadCsv("operations-report.csv", [["Restaurant", "Station", "Orders", "Accepted %", "Avg prep (min)", "On time %", "Complaints"], ...RESTAURANTS.map((r) => [r.name, r.station, r.orders, r.accepted, r.prep, r.onTime, r.complaints])])}
      tiles={[
        { label: "On-time delivery", value: "94%", note: "delivered before train left", tone: "up" },
        { label: "Avg prep time", value: "16 min", note: "order accepted to food ready" },
        { label: "Missed deliveries", value: "41", note: "train left before handover", tone: "down" },
        { label: "Acceptance rate", value: "96%", note: "orders accepted by restaurants" },
      ]}>
      <div className="td-an-pair td-an-pair--even">
        <Card title="On-time delivery" note="Daily %, target 95%">
          <LineChart labels={days} labelEvery={2} ticks={[85, 90, 95, 100]} format={(v) => `${v}%`} height={150} target={{ value: 95, label: "Target" }}
            series={[{ name: "On-time delivery", color: COLORS.teal, values: ON_TIME, endLabel: `${ON_TIME[11]}%` }]} />
        </Card>
        <Card title="Prep time" note="Orders by minutes from accept to ready">
          <Histogram items={PREP_TIME} height={150} />
        </Card>
      </div>

      <div className="td-table-card">
        <div className="td-table-card-head"><h3>Restaurant performance</h3><span className="td-an-hint">Red = needs attention</span></div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Restaurant</th><th className="td-num">Orders</th><th className="td-num">Accepted</th><th className="td-num">Avg prep</th><th className="td-num">On time</th><th className="td-num">Complaints</th></tr></thead>
            <tbody>
              {RESTAURANTS.map((r) => (
                <tr key={r.name}>
                  <td><div className="td-contact"><strong>{r.name}</strong><small>{r.station}</small></div></td>
                  <td className="td-num">{r.orders}</td>
                  <td className={`td-num${r.accepted < 92 ? " td-an-bad" : ""}`}><strong>{r.accepted}%</strong></td>
                  <td className={`td-num${r.prep > 20 ? " td-an-bad" : ""}`}><strong>{r.prep} min</strong></td>
                  <td className={`td-num${r.onTime < 90 ? " td-an-bad" : ""}`}><strong>{r.onTime}%</strong></td>
                  <td className={`td-num${r.complaints >= 9 ? " td-an-bad" : ""}`}><strong>{r.complaints}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
