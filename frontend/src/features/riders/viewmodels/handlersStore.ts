"use client";

import { useSyncExternalStore } from "react";

/**
 * Station handlers have no backend endpoints yet, so they live in this in-memory store, seeded
 * with sample data. When the API exists, replace the seed and the functions below with RTK Query
 * endpoints; the views only use `useHandlers`.
 */
export type HandlerStatus = "active" | "inactive" | "pending";

export type Handler = {
  id: string;
  name: string;
  mobile: string;
  station: string;
  platforms: string;
  shift: string;
  status: HandlerStatus;
  /** Days since the application was submitted (pending handlers). */
  appliedDaysAgo: number;
  documents: { aadhaar: boolean; photo: boolean; police: boolean; pass: boolean };
};

export const SHIFTS = ["6 AM - 2 PM", "2 PM - 10 PM", "10 PM - 6 AM", "10 AM - 6 PM"];

const all = { aadhaar: true, photo: true, police: true, pass: true };

const seed: Handler[] = [
  { id: "HD-4A21", name: "Lakshmi Devi", mobile: "9848033120", station: "Vijayawada Junction", platforms: "Platform 1-4", shift: "6 AM - 2 PM", status: "active", appliedDaysAgo: 30, documents: all },
  { id: "HD-7C09", name: "Prakash Rao", mobile: "9963288410", station: "Vijayawada Junction", platforms: "Platform 5-10", shift: "2 PM - 10 PM", status: "active", appliedDaysAgo: 24, documents: all },
  { id: "HD-2B55", name: "Imran Shaikh", mobile: "9000241763", station: "Secunderabad Junction", platforms: "All platforms", shift: "6 AM - 2 PM", status: "active", appliedDaysAgo: 18, documents: all },
  { id: "HD-9E12", name: "Sunitha K", mobile: "8121066530", station: "Warangal", platforms: "All platforms", shift: "10 AM - 6 PM", status: "inactive", appliedDaysAgo: 12, documents: all },
  { id: "HD-3F70", name: "Venkat Rao", mobile: "9701122334", station: "Secunderabad Junction", platforms: "Platform 1-6", shift: "6 AM - 2 PM", status: "pending", appliedDaysAgo: 0, documents: all },
  { id: "HD-5D18", name: "Anitha Reddy", mobile: "9246677889", station: "Warangal", platforms: "All platforms", shift: "2 PM - 10 PM", status: "pending", appliedDaysAgo: 1, documents: { ...all, pass: false } },
];

let state: Handler[] = seed;
const listeners = new Set<() => void>();
const set = (next: Handler[]) => { state = next; listeners.forEach((listener) => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export const useHandlers = (): Handler[] => useSyncExternalStore(subscribe, () => state, () => state);

const randomSuffix = () => Math.random().toString(16).slice(2, 6).toUpperCase();

/** An admin-added handler is approved straight away. */
export function addHandler(input: Pick<Handler, "name" | "mobile" | "station" | "platforms" | "shift">) {
  set([{ ...input, id: `HD-${randomSuffix()}`, status: "active", appliedDaysAgo: 0, documents: all }, ...state]);
}

export function setHandlerStatus(id: string, status: HandlerStatus) {
  set(state.map((handler) => (handler.id === id ? { ...handler, status } : handler)));
}

export function removeHandler(id: string) {
  set(state.filter((handler) => handler.id !== id));
}
