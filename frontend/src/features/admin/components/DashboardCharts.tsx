"use client";

import { useEffect, useRef, useState } from "react";

type Pt = { x: number; y: number };

/** Smooth curve through the points that never overshoots (monotone cubic, like d3's curveMonotoneX). */
export function smoothPath(points: Pt[]): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M${points[0].x},${points[0].y}`;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i += 1) d.push((points[i + 1].y - points[i].y) / (points[i + 1].x - points[i].x || 1));
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i += 1) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const dx = (points[i + 1].x - points[i].x) / 3;
    path += `C${points[i].x + dx},${points[i].y + m[i] * dx},${points[i + 1].x - dx},${points[i + 1].y - m[i + 1] * dx},${points[i + 1].x},${points[i + 1].y}`;
  }
  return path;
}

function useSize(initial: { w: number; h: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: Math.max(260, Math.round(el.clientWidth)), h: Math.max(160, Math.round(el.clientHeight)) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

const rupees = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;
const axisK = (value: number) => (value >= 100000 ? `₹${+(value / 100000).toFixed(1)}L` : value >= 1000 ? `₹${+(value / 1000).toFixed(1)}k` : `₹${Math.round(value)}`);

const niceCeil = (max: number) => {
  if (max <= 0) return 40000;
  const step = 10 ** Math.floor(Math.log10(max / 4));
  const unit = [1, 2, 2.5, 5, 10].find((m) => m * step * 4 >= max) ?? 10;
  return unit * step * 4;
};

export type RevenueSeries = { name: string; color: string; tint: string; ink: string; values: number[] };

/** Revenue over the chosen period; every series has one value per label. */
export function RevenueChart({ series, labels, fullLabels }: { series: RevenueSeries[]; labels: string[]; fullLabels?: string[] }) {
  const [ref, { w: W, h: H }] = useSize({ w: 640, h: 220 });
  const [hover, setHover] = useState<number | null>(null);
  const L = 48, R = 14, T = 30, B = 38;
  const plotW = W - L - R, plotH = H - T - B;
  const count = labels.length;
  const last = Math.max(count - 1, 1);
  const labelStep = Math.ceil(count / 12);
  const showLabel = (i: number) => i % labelStep === 0 || i === count - 1;
  const top = niceCeil(Math.max(...series.flatMap((s) => s.values), 0));
  const x = (i: number) => (count > 1 ? L + (plotW / last) * i : L + plotW / 2);
  const slot = plotW / last;
  const y = (v: number) => T + plotH - (v / top) * plotH;
  const ticks = [1, 2, 3, 4].map((i) => (top / 4) * i);
  const peak = (values: number[]) => values.reduce((best, v, i) => (v > values[best] ? i : best), 0);

  // With no hover, each series highlights its own best month; hovering compares one month across series.
  const marks = series.map((s, index) => ({ series: s, index, month: hover ?? peak(s.values) }));
  const lowestFirst = [...marks].sort((a, b) => y(a.series.values[a.month]) - y(b.series.values[b.month]));

  return (
    <div className="td-chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Total revenue for the selected period" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => <text key={t} x={L - 12} y={y(t) + 4} textAnchor="end" className="td-axis">{axisK(t)}</text>)}
        {labels.map((m, i) => showLabel(i) && <line key={m + i} x1={x(i)} x2={x(i)} y1={T - 6} y2={T + plotH} className="td-vgrid" />)}
        {series.map((s) => <path key={s.name} d={smoothPath(s.values.map((v, i) => ({ x: x(i), y: y(v) })))} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />)}
        {marks.map(({ series: s, month }) => (
          <g key={s.name}>
            <line x1={x(month)} x2={x(month)} y1={y(s.values[month])} y2={T + plotH} stroke={s.color} strokeDasharray="2 3" strokeWidth="1.2" />
            <circle cx={x(month)} cy={y(s.values[month])} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />
          </g>
        ))}
        {labels.map((m, i) => {
          if (!showLabel(i)) return null;
          const lit = marks.find((mk) => mk.month === i);
          return (
            <g key={m + i}>
              <circle cx={x(i)} cy={T + plotH + 14} r="3.2" fill={lit ? lit.series.color : "#fff"} stroke={lit ? lit.series.color : "#c9c8d0"} strokeWidth="1.2" />
              <text x={x(i)} y={T + plotH + 32} textAnchor="middle" className="td-axis td-axis--month">{m}</text>
            </g>
          );
        })}
        {lowestFirst.map(({ series: s, month }, order) => {
          const label = rupees(s.values[month]);
          const bw = label.length * 6.6 + 16;
          const cx = Math.min(Math.max(x(month), L + bw / 2), W - R - bw / 2);
          const below = order > 0 && lowestFirst.length > 1;
          const by = below ? y(s.values[month]) + 10 : y(s.values[month]) - 30;
          return (
            <g key={`b-${s.name}`} pointerEvents="none">
              <rect x={cx - bw / 2} y={by} width={bw} height="20" rx="5" fill={s.tint} />
              <text x={cx} y={by + 14} textAnchor="middle" className="td-badge" fill={s.ink}>{label}</text>
            </g>
          );
        })}
        {labels.map((m, i) => <rect key={`hit-${m}${i}`} x={x(i) - slot / 2} y={T - 8} width={slot} height={plotH + 30} fill="transparent" tabIndex={0} aria-label={`${fullLabels?.[i] ?? m}: ${series.map((s) => `${s.name} ${rupees(s.values[i])}`).join(", ")}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />)}
      </svg>
    </div>
  );
}

export type OrderBucket = { key: string; label: string; full: string; count: number; revenue: number };

export function OrdersChart({ buckets }: { buckets: OrderBucket[] }) {
  const [ref, { w: W, h: H }] = useSize({ w: 460, h: 220 });
  const [hover, setHover] = useState<number | null>(null);
  const L = 18, R = 18, T = 64, B = 30;
  const plotW = W - L - R, plotH = H - T - B;
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const slot = buckets.length > 1 ? plotW / (buckets.length - 1) : 0;
  const x = (i: number) => (buckets.length > 1 ? L + slot * i : L + plotW / 2);
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const pts = buckets.map((b, i) => ({ x: x(i), y: y(b.count) }));
  const line = smoothPath(pts);
  const peak = buckets.reduce((best, b, i) => (b.count > buckets[best].count ? i : best), 0);
  const active = hover ?? (buckets[peak]?.count ? peak : null);
  const labelStep = Math.ceil(buckets.length / 8);
  const gradientId = "td-orders-fill";
  const tip = active === null ? null : buckets[active];
  const tipW = 92, tipH = 46;
  const tipX = active === null ? 0 : Math.min(Math.max(x(active) - tipW / 2, 4), W - tipW - 4);
  const tipY = active === null ? 0 : Math.max(y(buckets[active].count) - tipH - 12, 2);

  return (
    <div className="td-chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Orders per day" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fa8a1b" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#fa8a1b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {buckets.length > 1 && <path d={`${line}L${x(buckets.length - 1)},${T + plotH}L${x(0)},${T + plotH}Z`} fill={`url(#${gradientId})`} />}
        <path d={line} fill="none" stroke="#e8700d" strokeWidth="2.2" strokeLinecap="round" />
        {buckets.map((b, i) => (i % labelStep === 0 || i === buckets.length - 1) && <text key={b.key} x={x(i)} y={H - 8} textAnchor="middle" className="td-axis td-axis--month">{b.label}</text>)}
        {active !== null && <circle cx={x(active)} cy={y(buckets[active].count)} r="5" fill="#e8700d" stroke="#fff" strokeWidth="2" pointerEvents="none" />}
        {tip && (
          <g pointerEvents="none">
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8" className="td-tip" />
            <text x={tipX + tipW / 2} y={tipY + 20} textAnchor="middle" className="td-tip-value">{tip.count} {tip.count === 1 ? "Order" : "Orders"}</text>
            <text x={tipX + tipW / 2} y={tipY + 36} textAnchor="middle" className="td-tip-date">{tip.full}</text>
          </g>
        )}
        {buckets.map((b, i) => <rect key={`hit-${b.key}`} x={x(i) - (slot || plotW) / 2} y={0} width={slot || plotW} height={H} fill="transparent" tabIndex={0} aria-label={`${b.full}: ${b.count} orders`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} />)}
      </svg>
    </div>
  );
}
