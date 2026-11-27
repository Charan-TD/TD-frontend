"use client";

import { useState } from "react";

import { performanceSample } from "../viewmodels/marketingStore";

const PERIODS = ["This month", "Last month", "Last 30 days", "All time"];

/** Sample figures: there is no marketing reporting API yet, so the numbers come from the store. */
export function MarketingPerformanceView() {
  const [period, setPeriod] = useState(PERIODS[0]);
  const { tiles, coupons, channels } = performanceSample;

  return (
    <section className="td-perf">
      <header className="td-perf-head td-perf-head--center">
        <p>All offers, coupons and campaigns · {period}</p>
        <div className="td-perf-filters">
          <label className="td-select">
            <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Time range">
              {PERIODS.map((label) => <option key={label} value={label}>{label}</option>)}
            </select>
          </label>
        </div>
      </header>

      <div className="api-state" role="note">Sample data: marketing figures aren&apos;t connected to the backend yet.</div>

      <div className="td-perf-tiles td-perf-tiles--four">
        {tiles.map((tile) => <div key={tile.label}><small>{tile.label}</small><strong>{tile.value}</strong><span>{tile.note}</span></div>)}
      </div>

      <div className="td-mk-split">
        <div className="td-table-card">
          <div className="td-table-card-head"><h3>Top coupons</h3></div>
          <div className="td-table-scroll">
            <table className="td-table">
              <thead><tr><th>Code</th><th className="td-th-right">Used</th><th className="td-th-right">Discount</th><th className="td-th-right">Sales</th></tr></thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.code}>
                    <td className="td-mk-code">{coupon.code}</td>
                    <td className="td-num">{coupon.used}</td>
                    <td className="td-num td-muted">{coupon.discount}</td>
                    <td className="td-num"><strong>{coupon.sales}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="td-perf-card">
          <h3>Campaigns by channel</h3>
          <ul className="td-mk-bars">
            {channels.map((channel) => (
              <li key={channel.name}>
                <span>{channel.name}</span>
                <i><u style={{ width: `${Math.min(100, channel.opened * 2)}%` }} /></i>
                <em><b>{channel.opened}%</b> opened · {channel.orders} orders</em>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
