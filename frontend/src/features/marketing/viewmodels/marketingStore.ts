"use client";

import { useSyncExternalStore } from "react";

/**
 * Offers and campaigns have no backend endpoints yet, so they live in this in-memory store, seeded
 * with sample data. When the API exists, replace the seed and the functions below with RTK Query
 * endpoints; the views only use `useOffers` / `useCampaigns`.
 */
export type Phase = "live" | "scheduled" | "ended";

export type Offer = {
  id: string;
  name: string;
  /** Who it is for, e.g. "New users only". */
  note: string;
  discount: string;
  appliesTo: string;
  shownOn: string;
  /** Start and end, as ISO dates. */
  start: string;
  end: string;
  used: number | null;
  enabled: boolean;
  /** Tile colour behind the offer's image placeholder. */
  tone: number;
};

export type Campaign = {
  id: string;
  headline: string;
  buttonText: string;
  /** Hex colour behind the banner. */
  colour: string;
  imageName: string;
  info: string;
  terms: string;
  restaurantIds: string[];
  /** e.g. "14 restaurants". Kept apart from restaurantIds so sample rows can show a count. */
  restaurantCount: number;
  stations: string;
  start: string;
  end: string;
  views: number | null;
  orders: number | null;
  enabled: boolean;
};

export const BANNER_COLOURS = ["#f0640a", "#c2410c", "#1f7a4d", "#1d5f8a", "#6b46a8"];

const DAY = 86_400_000;
const day = (offset: number, hour = 0, minute = 0) => {
  const date = new Date(Date.now() + offset * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const phaseOf = (item: { start: string; end: string }, now = Date.now()): Phase =>
  new Date(item.end).getTime() < now ? "ended" : new Date(item.start).getTime() > now ? "scheduled" : "live";

const offerSeed: Offer[] = [
  { id: "OF-1", name: "Flat ₹75 off on first order", note: "New users only", discount: "₹75 off · min ₹199", appliesTo: "All restaurants", shownOn: "Home banner", start: day(-18), end: day(11), used: 412, enabled: true, tone: 0 },
  { id: "OF-2", name: "20% off biryani", note: "Biryani category", discount: "20% up to ₹100", appliesTo: "12 restaurants", shownOn: "Home banner, Category", start: day(-14), end: day(1), used: 286, enabled: true, tone: 1 },
  { id: "OF-3", name: "Free water bottle", note: "Orders above ₹299", discount: "Free item", appliesTo: "Vijayawada Junction", shownOn: "Checkout", start: day(-18), end: day(4), used: 154, enabled: true, tone: 2 },
  { id: "OF-4", name: "Breakfast combo ₹99", note: "6 AM - 11 AM only", discount: "Combo price", appliesTo: "8 restaurants", shownOn: "Restaurant page", start: day(5), end: day(35), used: null, enabled: false, tone: 3 },
  { id: "OF-5", name: "Diwali festive 15% off", note: "All users", discount: "15% up to ₹120", appliesTo: "All restaurants", shownOn: "Home banner", start: day(-30), end: day(-14), used: 1204, enabled: false, tone: 4 },
];

const couponSeed: Offer[] = [
  { id: "CO-1", name: "FIRSTMEAL", note: "New users only", discount: "₹75 off · min ₹199", appliesTo: "All restaurants", shownOn: "Checkout", start: day(-18), end: day(11), used: 542, enabled: true, tone: 0 },
  { id: "CO-2", name: "TRAIN50", note: "Orders above ₹399", discount: "50% up to ₹100", appliesTo: "12 restaurants", shownOn: "Checkout, Coupons page", start: day(-14), end: day(1), used: 318, enabled: true, tone: 1 },
  { id: "CO-3", name: "BZA20", note: "Vijayawada Junction only", discount: "20% up to ₹60", appliesTo: "Vijayawada Junction", shownOn: "Checkout", start: day(-18), end: day(4), used: 96, enabled: true, tone: 2 },
  { id: "CO-4", name: "BREAKFAST99", note: "6 AM - 11 AM only", discount: "Combo price", appliesTo: "8 restaurants", shownOn: "Restaurant page", start: day(5), end: day(35), used: null, enabled: false, tone: 3 },
  { id: "CO-5", name: "GROUP10", note: "Group orders", discount: "10% up to ₹500", appliesTo: "All restaurants", shownOn: "Group orders", start: day(-30), end: day(-14), used: 12, enabled: false, tone: 4 },
];

const campaignSeed: Campaign[] = [
  { id: "CP-1", headline: "Here's 60% off & free delivery on first order!", buttonText: "Start ordering", colour: BANNER_COLOURS[0], imageName: "pizza-box.png", info: "Get 60% off (up to ₹120) and free delivery on your first Train Dabba order. Valid on all participating restaurants at any station.", terms: "Valid once per customer on the first order only. Minimum order ₹199. Cannot be combined with other coupons.", restaurantIds: [], restaurantCount: 14, stations: "All stations", start: day(-18), end: day(11), views: 12480, orders: 1204, enabled: true },
  { id: "CP-2", headline: "Biryani fest — flat ₹100 off", buttonText: "Order biryani", colour: BANNER_COLOURS[1], imageName: "biryani.png", info: "Flat ₹100 off on every biryani this week.", terms: "Valid on biryani items only.", restaurantIds: [], restaurantCount: 9, stations: "Vijayawada, Secunderabad", start: day(-9), end: day(1), views: 6320, orders: 612, enabled: true },
  { id: "CP-3", headline: "Breakfast on the go from ₹99", buttonText: "See breakfast", colour: "#e87d12", imageName: "breakfast.png", info: "Breakfast combos from ₹99, delivered to your seat.", terms: "Available 6 AM - 11 AM.", restaurantIds: [], restaurantCount: 8, stations: "All stations", start: day(5), end: day(35), views: null, orders: null, enabled: false },
  { id: "CP-4", headline: "Diwali specials", buttonText: "Explore", colour: "#d94a14", imageName: "diwali.png", info: "Festive specials from our restaurant partners.", terms: "While stocks last.", restaurantIds: [], restaurantCount: 22, stations: "All stations", start: day(-30), end: day(-14), views: 21940, orders: 2310, enabled: false },
];

function makeStore<T>(seed: T[]) {
  let state = seed;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next: T[]) => { state = next; listeners.forEach((listener) => listener()); },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

const offers = makeStore(offerSeed);
const campaigns = makeStore(campaignSeed);
const coupons = makeStore(couponSeed);
const nextId = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 7).toUpperCase()}`;

export const useOffers = (): Offer[] => useSyncExternalStore(offers.subscribe, offers.get, offers.get);
export const useCoupons = (): Offer[] => useSyncExternalStore(coupons.subscribe, coupons.get, coupons.get);
export const useCampaigns = (): Campaign[] => useSyncExternalStore(campaigns.subscribe, campaigns.get, campaigns.get);

export type PromoKind = "offer" | "coupon";
const storeFor = (kind: PromoKind) => (kind === "coupon" ? coupons : offers);

export function savePromo(kind: PromoKind, offer: Omit<Offer, "id" | "used" | "tone"> & { id?: string }) {
  const store = storeFor(kind);
  const current = store.get();
  if (offer.id && current.some((item) => item.id === offer.id)) {
    store.set(current.map((item) => (item.id === offer.id ? { ...item, ...offer, id: item.id } : item)));
  } else {
    store.set([{ ...offer, id: nextId(kind === "coupon" ? "CO" : "OF"), used: null, tone: current.length % 5 }, ...current]);
  }
}

export function setPromoEnabled(kind: PromoKind, id: string, enabled: boolean) {
  const store = storeFor(kind);
  store.set(store.get().map((item) => (item.id === id ? { ...item, enabled } : item)));
}

export function saveCampaign(campaign: Omit<Campaign, "id" | "views" | "orders" | "restaurantCount" | "stations"> & { id?: string; restaurantCount: number; stations: string }) {
  const current = campaigns.get();
  if (campaign.id && current.some((item) => item.id === campaign.id)) {
    campaigns.set(current.map((item) => (item.id === campaign.id ? { ...item, ...campaign, id: item.id } : item)));
  } else {
    campaigns.set([{ ...campaign, id: nextId("CP"), views: null, orders: null }, ...current]);
  }
}

export function setCampaignEnabled(id: string, enabled: boolean) {
  campaigns.set(campaigns.get().map((item) => (item.id === id ? { ...item, enabled } : item)));
}

/** Sample figures for the Marketing performance report. */
export const performanceSample = {
  tiles: [
    { label: "Orders with a discount", value: "1,476", note: "32% of all orders" },
    { label: "Discount given", value: "₹96,210", note: "avg ₹65 per order" },
    { label: "Sales from discounted orders", value: "₹4,18,300", note: "4.3× the discount given" },
    { label: "New customers", value: "638", note: "from first-order offers" },
  ],
  coupons: [
    { code: "FIRSTMEAL", used: 542, discount: "₹38,420", sales: "₹1,52,600" },
    { code: "TRAIN50", used: 318, discount: "₹15,900", sales: "₹1,04,940" },
    { code: "BZA20", used: 96, discount: "₹5,180", sales: "₹27,360" },
    { code: "GROUP10", used: 12, discount: "₹6,240", sales: "₹62,400" },
  ],
  channels: [
    { name: "WhatsApp", opened: 41, orders: 212 },
    { name: "Push", opened: 28, orders: 96 },
    { name: "SMS", opened: 12, orders: 388 },
  ],
};
