"use client";

import { useCallback, useMemo, useState } from "react";
import type { PortalSection } from "../models/portal";
import { useGetAllOrdersQuery } from "../../orders/api/ordersApi";
import { useGetRidersQuery } from "../../riders/api/ridersApi";
import { useGetRegistrationRequestsQuery } from "../../restaurants/api/registrationRequestsApi";
import { useGetProfileEditRequestsQuery } from "../../restaurants/api/profileEditRequestsApi";

export type NotificationKind = "approvals" | "orders" | "setup";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  icon: "store" | "receipt" | "wallet" | "check" | "rider";
  tone: "danger" | "neutral" | "success" | "warning";
  title: string;
  detail: string;
  meta?: string;
  /** Small status text under the detail, e.g. "Pending". */
  tag?: string;
  action?: { label: string; section: PortalSection; subsection: string };
  target: { section: PortalSection; subsection?: string };
  at?: string;
  /** Can this item be unread at all? Old orders start out as "earlier". */
  fresh: boolean;
};

const STORAGE_KEY = "td-read-notifications";
const FRESH_MS = 48 * 3_600_000;

const loadRead = (): string[] => {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as string[]; } catch { return []; }
};
const saveRead = (ids: string[]) => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-300))); } catch { /* storage unavailable */ }
};

const rupees = (value: unknown) => `₹${(Number(value) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function formatStamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  return `${day}, ${time}`;
}

export function useNotifications(has: (section: PortalSection) => boolean) {
  const registrations = useGetRegistrationRequestsQuery("pending", { skip: !has("restaurants") });
  const profileEdits = useGetProfileEditRequestsQuery("pending", { skip: !has("restaurants") });
  const riders = useGetRidersQuery(undefined, { skip: !has("riders") });
  const orders = useGetAllOrdersQuery(undefined, { skip: !has("orders") });
  const [now] = useState(() => Date.now());
  const [readIds, setReadIds] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadRead()));

  const pendingRestaurants = (registrations.data?.length ?? 0) + (profileEdits.data?.length ?? 0);
  const pendingRiders = riders.data?.filter((rider) => String(rider.status).toLowerCase() === "pending").length ?? 0;

  const canRestaurants = has("restaurants"), canRiders = has("riders"), canSales = has("sales");
  const items = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    if (canRestaurants && pendingRestaurants > 0) {
      list.push({
        id: `restaurants-pending-${pendingRestaurants}`, kind: "approvals", icon: "store", tone: "danger", fresh: true,
        title: `${pendingRestaurants} ${pendingRestaurants === 1 ? "restaurant" : "restaurants"} waiting for approval`,
        detail: "New partner applications need your review before they can take orders.", tag: "Pending",
        action: { label: "Review", section: "restaurants", subsection: "restaurants-approvals" },
        target: { section: "restaurants", subsection: "restaurants-approvals" },
      });
    }
    if (canRiders && pendingRiders > 0) {
      list.push({
        id: `riders-pending-${pendingRiders}`, kind: "approvals", icon: "rider", tone: "danger", fresh: true,
        title: `${pendingRiders} ${pendingRiders === 1 ? "rider" : "riders"} waiting for verification`,
        detail: "Delivery partner applications are waiting for review.", tag: "Pending",
        action: { label: "Review", section: "riders", subsection: "riders-approvals" },
        target: { section: "riders", subsection: "riders-approvals" },
      });
    }
    if (canSales) {
      list.push({
        id: "payments-not-connected", kind: "setup", icon: "wallet", tone: "neutral", fresh: true,
        title: "Payments not connected", detail: "Connect a payment account to start receiving settlements.", tag: "Setup",
        action: { label: "Connect", section: "sales", subsection: "sales-all" },
        target: { section: "sales", subsection: "sales-all" },
      });
    }
    [...(orders.data ?? [])]
      .filter((order) => order.created_at && !Number.isNaN(Date.parse(order.created_at)))
      .sort((a, b) => Date.parse(b.created_at as string) - Date.parse(a.created_at as string))
      .slice(0, 8)
      .forEach((order, index) => {
        const at = order.created_at as string;
        const delivered = /deliver/i.test(String(order.status_label || order.status)) && !/out for/i.test(String(order.status_label || order.status));
        const detail = [order.restaurant_name, order.total != null && order.total !== "" ? rupees(order.total) : null, order.delivery_station_name].filter(Boolean).join(" · ");
        list.push({
          id: `order-${order.id ?? order.order_number ?? index}`, kind: "orders", icon: delivered ? "check" : "receipt", tone: delivered ? "success" : "neutral",
          fresh: now - Date.parse(at) < FRESH_MS,
          title: delivered ? `Order #${order.order_number ?? ""} delivered` : `New order #${order.order_number ?? ""}`,
          detail: delivered ? detail : [detail, order.status_label || order.status].filter(Boolean).join(" · "),
          meta: formatStamp(at), at, target: { section: "orders", subsection: "orders-all" },
        });
      });
    return list;
  }, [pendingRestaurants, pendingRiders, orders.data, canRestaurants, canRiders, canSales, now]);

  const isUnread = useCallback((item: NotificationItem) => item.fresh && !readIds.includes(item.id), [readIds]);
  const unreadCount = items.filter(isUnread).length;

  const markRead = (id: string) => setReadIds((current) => { if (current.includes(id)) return current; const next = [...current, id]; saveRead(next); return next; });
  const markAllRead = () => setReadIds((current) => { const next = Array.from(new Set([...current, ...items.map((item) => item.id)])); saveRead(next); return next; });

  return { items, isUnread, unreadCount, markRead, markAllRead, pendingApprovals: pendingRestaurants + pendingRiders, pendingRestaurants, pendingRiders };
}

export type NotificationsState = ReturnType<typeof useNotifications>;
