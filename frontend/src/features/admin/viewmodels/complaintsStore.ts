"use client";

import { useSyncExternalStore } from "react";

import type { Complaint, ComplaintKind } from "../models/complaints";

/**
 * Complaints have no backend endpoint yet, so they live in this small in-memory store,
 * seeded with sample data. Replace `seed` and `replyToComplaint` with API calls once the
 * endpoint exists; the views only use the hook below.
 */
const customerSeed: Omit<Complaint, "kind">[] = [
  { id: "CMP-1018", subject: "Food not delivered at Vijayawada Jn", description: "My order was marked out for delivery but nobody came to my coach at Vijayawada Jn. The train left and I didn't get my food. Please refund or help.", customerName: "Ravi Kumar", orderNumber: "ORD-IKL1-089967", raisedAt: "2026-11-10", status: "open" },
  { id: "CMP-1017", subject: "Received cold biryani", description: "The biryani was cold when it reached my seat.", customerName: "Sneha Reddy", raisedAt: "2026-11-09", status: "open" },
  { id: "CMP-1016", subject: "Wrong item in my order", description: "I ordered a veg thali but received a non-veg meal.", customerName: "Arjun Mehta", raisedAt: "2026-11-08", status: "open" },
  { id: "CMP-1015", subject: "Refund not received yet", description: "My refund has not been credited after cancellation.", customerName: "Priya Sharma", raisedAt: "2026-11-07", status: "open" },
  { id: "CMP-1014", subject: "Delivery partner could not find my coach", description: "The delivery partner could not locate my coach.", customerName: "Kiran Rao", raisedAt: "2026-11-05", status: "resolved" },
  { id: "CMP-1013", subject: "Charged twice for one order", description: "I was charged twice for the same order.", customerName: "Anjali Nair", raisedAt: "2026-11-04", status: "in_progress" },
  { id: "CMP-1012", subject: "Order cancelled without reason", description: "My order was cancelled with no explanation.", customerName: "Vikram Singh", raisedAt: "2026-11-02", status: "resolved" },
  { id: "CMP-1011", subject: "Packaging leaked during delivery", description: "The packaging leaked and spoiled the meal.", customerName: "Meera Iyer", raisedAt: "2026-10-31", status: "resolved" },
  ...Array.from({ length: 10 }, (_, index): Omit<Complaint, "kind"> => ({
    id: `CMP-${1010 - index}`,
    subject: ["Late delivery", "Missing item", "Rude delivery partner", "Order quality issue", "Payment deducted, order failed"][index % 5],
    description: "Customer reported an issue with this order.",
    customerName: ["Rahul Verma", "Fatima Shaikh", "Ravi Kumar", "Sneha Reddy", "Arjun Mehta"][index % 5],
    raisedAt: `2026-10-${String(28 - index * 2).padStart(2, "0")}`,
    status: index < 1 ? "open" : index % 3 === 0 ? "in_progress" : "resolved",
  })),
];

const seed: Complaint[] = [
  ...customerSeed.map((c): Complaint => ({ ...c, kind: "customer" })),
];

let complaints: Complaint[] = seed;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function replyToComplaint(id: string, reply: string) {
  complaints = complaints.map((complaint) =>
    complaint.id === id ? { ...complaint, reply, status: "in_progress" } : complaint);
  emit();
}

const cache = new Map<string, { source: Complaint[]; value: Complaint[] }>();

/** Complaints of one kind; the returned array is stable until the store changes. */
export function useComplaints(kind: ComplaintKind = "customer"): Complaint[] {
  const all = useSyncExternalStore(subscribe, () => complaints, () => seed);
  const hit = cache.get(kind);
  if (hit && hit.source === all) return hit.value;
  const value = all.filter((c) => c.kind === kind);
  cache.set(kind, { source: all, value });
  return value;
}
