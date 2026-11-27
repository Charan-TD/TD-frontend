"use client";

import { useEffect, useRef, useState } from "react";

import { smoothPath } from "../admin/components/DashboardCharts";

export const COLORS = { teal: "#23977f", blue: "#2f6bbf", purple: "#7a5bc4", orange: "#e8730c", red: "#d9473f" };

function useWidth(initial = 640) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(240, Math.round(el.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

export type LineSeries = { name: string; color: string; values: number[]; /** Fill under the line. */ area?: boolean; /** Text next to the last point. */ endLabel?: string };

/** Smooth multi-series line chart with a labelled y axis and a dot plus label on the last point. */
export function LineChart({ labels, series, ticks, format, height = 190, target, labelEvery = 1 }: {
  labels: string[]; series: LineSeries[]; ticks: number[]; format: (value: number) => string; height?: number;
  target?: { value: number; label: string }; labelEvery?: number;
}) {
  const [ref, W] = useWidth();
  const L = 46, R = 48, T = 10, B = 26;
  const H = height;
  const min = ticks[0], max = ticks[ticks.length - 1];
  const x = (i: number) => L + ((W - L - R) / Math.max(labels.length - 1, 1)) * i;
  const y = (value: number) => T + (H - T - B) - ((value - min) / (max - min || 1)) * (H - T - B);

  return (
    <div className="td-an-chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label={series.map((s) => s.name).join(" and ")}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} stroke="var(--td-line-row)" />
            <text x={L - 8} y={y(tick) + 3.5} textAnchor="end" className="td-an-axis">{format(tick)}</text>
          </g>
        ))}
        {labels.map((label, i) => (i % labelEvery === 0 || i === labels.length - 1) && (
          <text key={label} x={x(i)} y={H - 6} textAnchor="middle" className="td-an-axis">{label}</text>
        ))}
        {target && (
          <g>
            <line x1={L} x2={W - R} y1={y(target.value)} y2={y(target.value)} stroke="var(--td-ink-muted)" strokeDasharray="4 4" />
            <text x={W - R + 6} y={y(target.value) - 3} className="td-an-axis">{target.label}</text>
          </g>
        )}
        {series.map((item) => {
          const points = item.values.map((value, i) => ({ x: x(i), y: y(value) }));
          const line = smoothPath(points);
          const last = points[points.length - 1];
          return (
            <g key={item.name}>
              {item.area && <path d={`${line}L${last.x},${H - B}L${points[0].x},${H - B}Z`} fill={item.color} opacity=".12" />}
              <path d={line} fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round" />
              <circle cx={last.x} cy={last.y} r="3.5" fill={item.color} />
              {item.endLabel && <text x={last.x + 8} y={last.y + 4} className="td-an-end">{item.endLabel}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Vertical bars that touch, each with its value on top. */
export function Histogram({ items, color = COLORS.purple, height = 170 }: { items: { label: string; value: number; text: string }[]; color?: string; height?: number }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="td-an-hist" style={{ height }}>
      {items.map((item) => (
        <div key={item.label}>
          <div className="td-an-hist-col">
            <b>{item.text}</b>
            <i style={{ height: `${(item.value / max) * 100}%`, background: color }} />
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/** One horizontal bar per row: label, bar, value. */
export function BarRows({ rows, color = COLORS.blue, labelWidth = 108 }: { rows: { label: string; value: number; text: string }[]; color?: string; labelWidth?: number }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="td-an-rows">
      {rows.map((row) => (
        <li key={row.label} style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr) 56px` }}>
          <span>{row.label}</span>
          <i><u style={{ width: `${(row.value / max) * 100}%`, background: color }} /></i>
          <b>{row.text}</b>
        </li>
      ))}
    </ul>
  );
}
