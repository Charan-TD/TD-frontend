"use client";

import { useEffect, useState } from "react";
import type { PortalSection } from "../models/portal";
import { Icon } from "./Icon";
import type { NotificationItem, NotificationKind, NotificationsState } from "./useNotifications";

type Tab = "all" | "unread" | NotificationKind;

type Props = {
  state: NotificationsState;
  onClose: () => void;
  onOpen: (section: PortalSection, subsection?: string) => void;
};

export function NotificationsPanel({ state, onClose, onOpen }: Props) {
  const { items, isUnread, unreadCount, markRead, markAllRead } = state;
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visible = items.filter((item) => tab === "all" ? true : tab === "unread" ? isUnread(item) : item.kind === tab);
  const fresh = visible.filter(isUnread);
  const earlier = visible.filter((item) => !isUnread(item));

  const go = (item: NotificationItem, target = item.target) => { markRead(item.id); onOpen(target.section, target.subsection); onClose(); };

  const row = (item: NotificationItem) => {
    const unread = isUnread(item);
    return (
      <li key={item.id} className={`td-note${unread ? " is-unread" : ""}`}>
        <button type="button" className="td-note-main" onClick={() => go(item)}>
          <span className={`td-note-icon td-note-icon--${item.tone}`}><Icon name={item.icon} size={16} /></span>
          <span className="td-note-copy">
            <b>{item.title}</b>
            <span>{item.detail}</span>
            {item.meta && <small>{item.meta}</small>}
          </span>
        </button>
        {(item.tag || item.action) && (
          <div className="td-note-foot">
            {item.tag && <small>{item.tag}</small>}
            {item.action && <button type="button" className={item.action.label === "Review" ? "td-note-cta" : "td-note-cta td-note-cta--outline"} onClick={() => go(item, { section: item.action!.section, subsection: item.action!.subsection })}>{item.action.label}</button>}
          </div>
        )}
        {unread && <i className="td-note-dot" aria-label="Unread" />}
      </li>
    );
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "all", label: "All" }, { id: "unread", label: "Unread", count: unreadCount },
    { id: "orders", label: "Orders" }, { id: "approvals", label: "Approvals" },
  ];

  return (
    <>
      <div className="td-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="td-drawer" role="dialog" aria-modal="true" aria-label="Notifications">
        <header className="td-drawer-head">
          <h2>Notifications</h2>
          <button type="button" className="td-link-button" onClick={markAllRead} disabled={unreadCount === 0}>Mark all as read</button>
          <button type="button" className="td-icon-btn" aria-label="Close notifications" onClick={onClose}><Icon name="close" size={16} /></button>
        </header>
        <div className="td-drawer-tabs" role="tablist">
          {tabs.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}>
              {item.label}{item.count ? <b>{item.count}</b> : null}
            </button>
          ))}
        </div>
        <div className="td-drawer-body">
          {visible.length === 0 && <p className="td-drawer-empty">You’re all caught up.</p>}
          {fresh.length > 0 && <><h3>New</h3><ul>{fresh.map(row)}</ul></>}
          {earlier.length > 0 && <><h3>Earlier</h3><ul>{earlier.map(row)}</ul></>}
        </div>
        <footer className="td-drawer-foot">
          <button type="button" onClick={() => setTab("all")}>View all notifications</button>
        </footer>
      </aside>
    </>
  );
}
