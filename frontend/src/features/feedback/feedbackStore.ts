"use client";

import { useSyncExternalStore } from "react";

/*
 * Reviews and complaints have no backend endpoints yet, so they live in this in-memory store, seeded with
 * sample data. The first rows of each list are the ones in the design; the rest are generated (fixed seed)
 * so the tab counts and page counts match. Replace the seed and the actions with API calls later; the
 * views only use the hooks and actions below.
 */

export const STATIONS = ["Secunderabad Junction", "Vijayawada Junction", "Hyderabad Deccan", "Warangal", "Kazipet Junction", "Mahim Junction"];
const RESTAURANTS: [string, string][] = [
  ["silver dum biryani", "Vijayawada Junction"], ["Paradise Station Cafe", "Secunderabad Junction"], ["Annapurna Meals", "Kazipet Junction"],
  ["Hotel Kakatiya", "Warangal"], ["traindhaba cloud kitchen", "Secunderabad Junction"], ["Chicken Dhaba", "Hyderabad Deccan"],
];
export const stationOfRestaurant = (name: string) => RESTAURANTS.find(([restaurant]) => restaurant === name)?.[1] ?? "";

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(random: () => number, items: readonly T[]) => items[Math.floor(random() * items.length)];
const digits = (random: () => number, length: number) => Array.from({ length }, () => Math.floor(random() * 10)).join("");
const people = ["Ravi Kumar", "Sneha Reddy", "Arjun P", "Priya S", "Mahesh B", "Kiran T", "Deepa N", "Vikram J", "Meena R", "Anil P", "Sana M", "Harsha V", "Lata S", "Naveen B"];

/* ----------------------------------------------------------------- reviews */

export type Review = { id: string; customer: string; order: string; restaurant: string; station: string; rating: number; text: string; daysAgo: number; replied: boolean; reply?: string };

export const REVIEW_TOTALS = { all: 1284, waiting: 14, low: 116 };
/** Reviews per star, 1★ first; they add up to 1,284. */
const STAR_COUNTS = [52, 64, 116, 308, 744];
export const RATING_SHARE = [58, 24, 9, 5, 4];
export const AVERAGE_RATING = 4.3;

const reviewHead: Review[] = [
  { id: "rv-1", customer: "Ravi Kumar", order: "ORD-IKL1-089967", restaurant: "silver dum biryani", station: "Vijayawada Junction", rating: 5, text: "Biryani reached my seat right on time and was still hot. Portion was generous.", daysAgo: 2, replied: true },
  { id: "rv-2", customer: "Sneha Reddy", order: "ORD-IKL1-514113", restaurant: "silver dum biryani", station: "Vijayawada Junction", rating: 4, text: "Easy to order with my PNR. Delivery partner found my coach quickly. Raita could be colder.", daysAgo: 4, replied: true },
  { id: "rv-3", customer: "Arjun P", order: "ORD-4RE7-221309", restaurant: "Paradise Station Cafe", station: "Secunderabad Junction", rating: 2, text: "Food was cold and one item was missing. Had to call support.", daysAgo: 5, replied: false },
  { id: "rv-4", customer: "Priya S", order: "ORD-2PL9-448120", restaurant: "Annapurna Meals", station: "Kazipet Junction", rating: 1, text: "Order never reached my seat, train left the station.", daysAgo: 6, replied: false },
  { id: "rv-5", customer: "Mahesh B", order: "ORD-9WD4-338712", restaurant: "Hotel Kakatiya", station: "Warangal", rating: 4, text: "Good taste and clean packing.", daysAgo: 7, replied: true },
];
const praise = ["Great food and quick delivery.", "Tasty and well packed.", "Loved the biryani, will order again.", "Reached my coach on time.", "Good portion for the price."];
const mixed = ["Decent food but a little late.", "Taste was okay, packing could be better.", "Average meal, delivery was fine."];
const bad = ["Food arrived cold.", "An item was missing from my order.", "Delivery was very late.", "Wrong item delivered."];

function buildReviews(): Review[] {
  const random = rng(5);
  const remaining: number[] = [];
  STAR_COUNTS.forEach((count, index) => {
    const stars = index + 1;
    const used = reviewHead.filter((review) => review.rating === stars).length;
    for (let k = 0; k < count - used; k += 1) remaining.push(stars);
  });
  for (let k = remaining.length - 1; k > 0; k -= 1) { const m = Math.floor(random() * (k + 1)); [remaining[k], remaining[m]] = [remaining[m], remaining[k]]; }
  const generated = remaining.map((rating, index): Review => {
    const [restaurant, station] = pick(random, RESTAURANTS);
    return {
      id: `rv-${index + 6}`, customer: pick(random, people), order: `ORD-${digits(random, 4)}-${digits(random, 6)}`, restaurant, station, rating,
      text: rating >= 4 ? pick(random, praise) : rating === 3 ? pick(random, mixed) : pick(random, bad), daysAgo: 7 + Math.floor(index / 40), replied: true,
    };
  });
  // 14 reviews wait for a reply: the two in the design plus the first twelve low-rated generated ones.
  let left = REVIEW_TOTALS.waiting - reviewHead.filter((review) => !review.replied).length;
  return [...reviewHead, ...generated.map((review) => (left > 0 && review.rating <= 2 ? (left -= 1, { ...review, replied: false }) : review))];
}

/* -------------------------------------------------------------- complaints */

export type ComplaintStatus = "Open" | "In progress" | "Resolved";
export type FeedbackComplaint = { id: string; kind: "customer" | "restaurant"; date: string; raisedBy: string; issue: string; order: string; restaurant: string; status: ComplaintStatus; detail: string; reply?: string };

const customerHead: FeedbackComplaint[] = [
  { id: "CMP-1018", kind: "customer", date: "12 Nov", raisedBy: "Ravi Kumar", issue: "Food not delivered, train left", order: "ORD-IKL1-571348", restaurant: "silver dum biryani", status: "Open", detail: "My order was marked out for delivery but nobody came to my coach and the train left the station." },
  { id: "CMP-1016", kind: "customer", date: "11 Nov", raisedBy: "Deepa N", issue: "Refund not received yet", order: "ORD-5YTU5H4Y", restaurant: "silver dum biryani", status: "In progress", detail: "My refund has not been credited after the order was cancelled.", reply: "We have raised this with the payments team." },
  { id: "CMP-1014", kind: "customer", date: "10 Nov", raisedBy: "Vikram J", issue: "Wrong item delivered", order: "ORD-3ZLDA7ZP", restaurant: "Annapurna Meals", status: "Resolved", detail: "I received a non-veg meal instead of the veg thali I ordered.", reply: "Refunded the difference and shared feedback with the restaurant." },
  { id: "CMP-1012", kind: "customer", date: "9 Nov", raisedBy: "Meena R", issue: "Charged twice for one order", order: "ORD-1AB2-118230", restaurant: "Hotel Kakatiya", status: "Resolved", detail: "The amount was debited twice for the same order.", reply: "The duplicate payment was refunded." },
  { id: "CMP-1011", kind: "customer", date: "8 Nov", raisedBy: "Kiran T", issue: "Delivery partner was rude", order: "ORD-IKL1-270650", restaurant: "silver dum biryani", status: "Resolved", detail: "The delivery partner spoke rudely at my seat.", reply: "We spoke to the delivery partner and issued a warning." },
];
const customerIssues = ["Late delivery", "Missing item", "Order quality issue", "Payment deducted, order failed", "Delivery partner could not find my coach"];
const restaurantIssues = ["Rider did not arrive for pickup", "Order cancelled after preparation", "Payout delayed", "Wrong delivery address on order", "Customer not found at the station", "Menu price not updated"];

function buildComplaints(): FeedbackComplaint[] {
  const random = rng(9);
  const customers = Array.from({ length: 12 }, (_, i): FeedbackComplaint => {
    const [restaurant] = pick(random, RESTAURANTS);
    return {
      id: `CMP-${1010 - i}`, kind: "customer", date: `${Math.max(1, 7 - Math.floor(i / 2))} Nov`, raisedBy: pick(random, people), issue: pick(random, customerIssues),
      order: `ORD-${digits(random, 4)}-${digits(random, 6)}`, restaurant, status: i < 2 ? "In progress" : "Resolved", detail: "Customer reported an issue with this order.",
    };
  });
  const restaurants = restaurantIssues.map((issue, i): FeedbackComplaint => {
    const [restaurant] = RESTAURANTS[i % RESTAURANTS.length];
    return {
      id: `CMP-R${201 + i}`, kind: "restaurant", date: `${12 - i} Nov`, raisedBy: restaurant, issue, order: `ORD-${digits(random, 4)}-${digits(random, 6)}`, restaurant,
      status: i === 0 ? "Open" : i === 1 ? "In progress" : "Resolved", detail: "Raised by the restaurant partner.",
    };
  });
  return [...customerHead, ...customers, ...restaurants];
}

/* ------------------------------------------------------------------- store */

let reviews: Review[] = buildReviews();
let complaints: FeedbackComplaint[] = buildComplaints();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export const useReviews = (): Review[] => useSyncExternalStore(subscribe, () => reviews, () => reviews);
export const useFeedbackComplaints = (): FeedbackComplaint[] => useSyncExternalStore(subscribe, () => complaints, () => complaints);

export function replyToReview(id: string, reply: string) {
  reviews = reviews.map((review) => (review.id === id ? { ...review, replied: true, reply } : review));
  emit();
}

export function replyToFeedbackComplaint(id: string, reply: string, resolve: boolean) {
  complaints = complaints.map((item) => (item.id === id ? { ...item, reply, status: resolve ? "Resolved" : "In progress" } : item));
  emit();
}
