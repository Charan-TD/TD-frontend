"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export const SectionActionsContext = createContext<HTMLDivElement | null>(null);
/** Where a page's search box goes: the left side of the shell's top bar. */
export const SectionSearchContext = createContext<HTMLDivElement | null>(null);

/** Keep section handlers and permissions local while rendering in the shell header. */
export function SectionActions({ children }: { children: ReactNode }) {
  const host = useContext(SectionActionsContext);
  const actions = <div className="section-header-actions">{children}</div>;
  return host ? createPortal(actions, host) : actions;
}

/** A page's search box, shown in the shell's top bar (as in the design) instead of inside the page. */
export function SectionSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const host = useContext(SectionSearchContext);
  const box = (
    <div className="td-search td-search--section">
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <Icon name="search" size={15} />
    </div>
  );
  return host ? createPortal(box, host) : box;
}
