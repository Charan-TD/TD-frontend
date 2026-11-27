"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import {
  PERIOD_OPTIONS, addDays, periodHint, periodRangeLabel, resolvePeriod, sameDay, startOfDay,
  type Period,
} from "../models/dashboardPeriod";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const shortDay = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function RangeCalendar({ initial, onCancel, onApply }: { initial: Period; onCancel: () => void; onApply: (from: Date, to: Date) => void }) {
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(new Date(initial.to.getFullYear(), initial.to.getMonth(), 1));
  const [start, setStart] = useState<Date | null>(initial.from);
  const [end, setEnd] = useState<Date | null>(initial.to);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const canGoNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= today;

  const pick = (day: Date) => {
    if (!start || (start && end)) { setStart(day); setEnd(null); return; }
    if (day < start) { setEnd(start); setStart(day); } else setEnd(day);
  };
  const summary = start ? (end && !sameDay(start, end) ? `${shortDay(start)} – ${shortDay(end)}` : shortDay(start)) : "Select dates";

  return (
    <div className="td-calendar" role="dialog" aria-label="Choose a custom date range">
      <div className="td-calendar-head">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Icon name="chevron-left" size={14} /></button>
        <strong>{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</strong>
        <button type="button" aria-label="Next month" disabled={!canGoNext} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Icon name="chevron-right" size={14} /></button>
      </div>
      <div className="td-calendar-grid">
        {WEEKDAYS.map((w) => <span key={w} className="td-calendar-dow">{w}</span>)}
        {cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />;
          const future = day > today;
          const isStart = !!start && sameDay(day, start);
          const isEnd = !!end && sameDay(day, end);
          const inside = !!start && !!end && day > start && day < end;
          const cls = ["td-day", isStart || isEnd ? "is-edge" : "", inside ? "is-inside" : "", isStart && end && !sameDay(start, end) ? "is-first" : "", isEnd && start && !sameDay(start, end) ? "is-last" : "", sameDay(day, today) ? "is-today" : ""].filter(Boolean).join(" ");
          return (
            <span key={day.getTime()} className={`td-day-cell${inside ? " is-inside" : ""}${isStart && end && !sameDay(start, end) ? " is-first" : ""}${isEnd && start && !sameDay(start, end) ? " is-last" : ""}`}>
              <button type="button" className={cls} disabled={future} onClick={() => pick(day)}>{day.getDate()}</button>
            </span>
          );
        })}
      </div>
      <div className="td-calendar-foot">
        <span>{summary}</span>
        <button type="button" className="td-link-button" onClick={onCancel}>Cancel</button>
        <button type="button" className="td-apply" disabled={!start} onClick={() => start && onApply(start, end ?? start)}>Apply</button>
      </div>
    </div>
  );
}

export function PeriodFilter({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  const [open, setOpen] = useState(false);
  const [calendar, setCalendar] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) { setOpen(false); setCalendar(false); } };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); setCalendar(false); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const close = () => { setOpen(false); setCalendar(false); };

  return (
    <div className="td-period" ref={ref}>
      <button type="button" className="td-period-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setOpen((o) => !o); setCalendar(false); }}>
        <span className="td-period-icon"><Icon name="calendar" size={18} /></span>
        <span className="td-period-copy"><strong>Filter Period</strong><small>{periodRangeLabel(period)}</small></span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && !calendar && (
        <div className="td-menu" role="menu">
          {PERIOD_OPTIONS.map((option) => {
            const resolved = resolvePeriod(option.id);
            const selected = period.id === option.id;
            return (
              <button key={option.id} type="button" role="menuitemradio" aria-checked={selected} className={selected ? "is-selected" : ""} onClick={() => { onChange(resolved); close(); }}>
                <span>{option.label}</span><small>{periodHint(resolved)}</small>{selected && <Icon name="check" size={14} />}
              </button>
            );
          })}
          <button type="button" role="menuitem" className={period.id === "custom" ? "is-selected" : ""} onClick={() => setCalendar(true)}>
            <span>Custom range...</span>{period.id === "custom" && <><small>{periodHint(period)}</small><Icon name="check" size={14} /></>}
          </button>
        </div>
      )}
      {open && calendar && (
        <RangeCalendar
          initial={period.id === "custom" ? period : { id: "custom", from: addDays(startOfDay(new Date()), -6), to: startOfDay(new Date()) }}
          onCancel={() => setCalendar(false)}
          onApply={(from, to) => { onChange({ id: "custom", from, to }); close(); }}
        />
      )}
    </div>
  );
}
