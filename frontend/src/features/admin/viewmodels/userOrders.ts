"use client";

import { useMemo } from "react";

import { useGetAllOrdersQuery, type Order } from "../../orders/api/ordersApi";

export const rupees = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export const orderTotal = (order: Order) => {
  const total = Number(order.total);
  if (Number.isFinite(total) && order.total != null) return total;
  return ["subtotal", "tax", "packaging_fee", "delivery_fee"].reduce((sum, key) => sum + (Number(order[key as keyof Order]) || 0), 0) - (Number(order.discount) || 0);
};

export const shortDate = (value: string | null | undefined, withYear = false) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) })
    : "-";
};

export type UserOrderStats = { orders: Order[]; count: number; spent: number; lastOrderAt: string | null; isLoading: boolean };

/** One customer's orders (newest first) with their totals, taken from the orders API. */
export function useUserOrders(userId: string | null | undefined): UserOrderStats {
  const query = useGetAllOrdersQuery();
  return useMemo(() => {
    const orders = (query.data ?? [])
      .filter((order) => userId && order.customer_user_id === userId)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    const spent = orders.filter((order) => !/cancel/i.test(String(order.status))).reduce((sum, order) => sum + orderTotal(order), 0);
    return { orders, count: orders.length, spent, lastOrderAt: orders[0]?.created_at ?? null, isLoading: query.isLoading };
  }, [query.data, query.isLoading, userId]);
}
