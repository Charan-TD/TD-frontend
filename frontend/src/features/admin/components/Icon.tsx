"use client";

import type { ReactNode } from "react";

type IconName =
  | "arrow-right" | "arrow-left" | "bell" | "calendar" | "chart" | "check"
  | "chevron-down" | "edit" | "help" | "lock" | "logout" | "menu"
  | "more" | "plus" | "rider" | "search" | "settings" | "store" | "users"
  | "bag" | "wallet" | "dashboard" | "station" | "sparkle" | "shield" | "eye" | "eye-off"
  | "megaphone" | "file" | "zap" | "employee" | "receipt" | "refresh"
  | "group" | "info" | "ban" | "unblock" | "block" | "play-circle" | "pause-circle" | "toggle-check" | "toggle-slash" | "trash" | "mail" | "phone" | "user";

const paths: Record<IconName, ReactNode> = {
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/></>,
  "arrow-right": <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  "arrow-left": <><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
  calendar: <><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  chart: <><path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  "chevron-down": <path d="m6 9 6 6 6-6"/>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.6 1.4c-.7 1-2.3 1.4-2.3 3.1"/><path d="M12 17h.01"/></>,
  lock: <><rect width="14" height="11" x="5" y="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  logout: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-5"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  rider: <><circle cx="12" cy="5" r="2"/><path d="m9 22 1-8 2-3 2 3 1 8M8 10l2 1M16 10l-2 1M5 14l4-2M19 14l-4-2"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m20 20-4.2-4.2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L6.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1h-.2v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z"/></>,
  store: <><path d="M3 10h18l-1.5-5h-15Z"/><path d="M5 10v10h14V10M9 20v-6h6v6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M17 11a4 4 0 0 0 0-8M21 21v-2a4 4 0 0 0-3-3.9"/></>,
  group: <><circle cx="12" cy="8" r="3"/><path d="M6.5 20v-1.5a3.5 3.5 0 0 1 3.5-3.5h4a3.5 3.5 0 0 1 3.5 3.5V20"/><circle cx="4.5" cy="10" r="2"/><path d="M2 18v-1a2.5 2.5 0 0 1 2.5-2.5"/><circle cx="19.5" cy="10" r="2"/><path d="M22 18v-1a2.5 2.5 0 0 0-2.5-2.5"/></>,
  bag: <><path d="M6 8h12l1 13H5Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  wallet: <><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6"/><path d="M16 14h.01"/></>,
  dashboard: <><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/></>,
  station: <><path d="M6 21V7l6-4 6 4v14"/><path d="M4 21h16"/><path d="M9 21v-5h6v5"/><path d="M9 9h.01M15 9h.01M9 12h.01M15 12h.01"/></>,
  sparkle: <><path d="m12 3-1.1 4.2L7 8.3l3.9 1.1L12 14l1.1-4.6L17 8.3l-3.9-1.1Z"/><path d="m19 15-.6 2.4L16 18l2.4.6L19 21l.6-2.4L22 18l-2.4-.6Z"/><path d="m5 15-.5 1.5L3 17l1.5.5L5 19l.5-1.5L7 17l-1.5-.5Z"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12"/><circle cx="12" cy="12" r="2"/></>,
  "eye-off": <><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-3.3 4.1M6.6 6.6C3.8 8.5 2 12 2 12s3.5 8 10 8a10 10 0 0 0 3.4-.6"/></>,
  megaphone: <><path d="M3 11v2a2 2 0 0 0 2 2h1l3 5 1-.6-2-4.4h7l5 2V6l-5 2H6a2 2 0 0 0-2 2Z"/><path d="M13 8v8"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></>,
  zap: <path d="M13 2 4 14h6l-1 8 9-12h-6Z"/>,
  employee: <><rect width="18" height="16" x="3" y="5" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M5.5 16c.5-1.7 1.7-2.5 3.5-2.5s3 .8 3.5 2.5M15 10h3M15 14h3"/></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  ban: <><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></>,
  unblock: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  block: <><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></>,
  "play-circle": <><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/></>,
  "pause-circle": <><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></>,
  "toggle-check": <><rect x="1" y="6" width="22" height="12" rx="6" fill="currentColor"/><circle cx="17" cy="12" r="4.3" fill="white" stroke="white"/><path d="m15.2 12 1.2 1.2 2.4-2.5"/></>,
  "toggle-slash": <><rect x="1" y="6" width="22" height="12" rx="6" fill="currentColor"/><circle cx="7" cy="12" r="4.3" fill="white" stroke="white"/><path d="m5.7 13.4 2.6-2.8"/></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3"/></>,
};

export function Icon({ name, size = 18, stroke = 1.8 }: { name: IconName; size?: number; stroke?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
