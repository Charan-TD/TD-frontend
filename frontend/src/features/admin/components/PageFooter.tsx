"use client";

import { Icon } from "./Icon";

/** "Showing 1–10 of 24 employees" with Previous / Page 1 of 3 / Next. */
export function PageFooter({ page, totalPages, total, pageSize, shown, noun, onChange, disabled = false }: {
  page: number; totalPages: number; total: number; pageSize: number; shown: number; noun: string;
  onChange: (page: number) => void; disabled?: boolean;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = total === 0 ? 0 : start + shown - 1;
  return (
    <footer className="td-page-footer">
      <span>Showing {start}–{end} of {total} {noun}</span>
      <div>
        <button type="button" className="td-page-btn" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}><Icon name="chevron-left" size={13} />Previous</button>
        <span>Page <b>{page}</b> of {Math.max(totalPages, 1)}</span>
        <button type="button" className="td-page-btn td-page-btn--next" disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>Next<Icon name="chevron-right" size={13} /></button>
      </div>
    </footer>
  );
}
