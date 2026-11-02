"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const SectionActionsContext = createContext<HTMLDivElement | null>(null);

/** Keep section handlers and permissions local while rendering in the shell header. */
export function SectionActions({ children }: { children: ReactNode }) {
  const host = useContext(SectionActionsContext);
  const actions = <div className="section-header-actions">{children}</div>;
  return host ? createPortal(actions, host) : actions;
}
