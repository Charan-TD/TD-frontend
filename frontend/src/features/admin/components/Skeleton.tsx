"use client";

import type { CSSProperties } from "react";

/** A single shimmering placeholder bar. */
export function Skeleton({ width = "100%", height = 12, style }: { width?: number | string; height?: number; style?: CSSProperties }) {
  return <span className="skeleton" style={{ width, height, ...style }} aria-hidden="true" />;
}

/** Placeholder rows shaped like a data table while it loads. */
export function SkeletonTable({ columns, rows = 6 }: { columns: string[]; rows?: number }) {
  return (
    <div className="employee-table-wrap" aria-busy="true" aria-label="Loading">
      <table className="employee-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {columns.map((column, col) => (
                <td key={column}>
                  <Skeleton width={col === 0 ? "70%" : `${45 + ((row * 7 + col * 13) % 35)}%`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
