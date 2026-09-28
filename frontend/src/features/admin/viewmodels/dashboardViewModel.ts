"use client";

import { useState } from "react";
import type { Activity, Metric } from "../models/portal";

const trendData = [
  { month: "Apr", revenue: "₹8.4L", orders: "868", x: 68, revenueY: 137, ordersY: 151 },
  { month: "May", revenue: "₹11.2L", orders: "1,024", x: 178, revenueY: 112, ordersY: 118 },
  { month: "Jun", revenue: "₹9.6L", orders: "942", x: 288, revenueY: 125, ordersY: 136 },
  { month: "Jul", revenue: "₹14.4L", orders: "1,138", x: 398, revenueY: 88, ordersY: 95 },
  { month: "Aug", revenue: "₹13.2L", orders: "1,096", x: 508, revenueY: 98, ordersY: 104 },
  { month: "Sep", revenue: "₹17.6L", orders: "1,248", x: 618, revenueY: 62, ordersY: 71 },
];

export function useDashboardViewModel(metrics: Metric[], activities: Activity[], onNavigateManagement: () => void) {
  const [trendMode, setTrendMode] = useState<"revenue" | "orders">("revenue");
  const [selectedPoint, setSelectedPoint] = useState(trendData.length - 1);
  const selected = trendData[selectedPoint];
  const pointString = trendData.map((point) => `${point.x},${point[`${trendMode}Y`]}`).join(" ");
  const areaPath = `M ${trendData[0].x} 205 L ${trendData.map((point) => `${point.x} ${point[`${trendMode}Y`]}`).join(" L ")} L ${trendData[trendData.length - 1].x} 205 Z`;

  return {
    metrics,
    activities,
    trendData,
    trendMode,
    setTrendMode,
    selectedPoint,
    setSelectedPoint,
    selected,
    pointString,
    areaPath,
    onNavigateManagement,
  };
}
