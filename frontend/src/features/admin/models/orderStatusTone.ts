export type StatusTone = "info" | "success" | "warning" | "danger" | "new" | "neutral";

/** Colour family for an order status label, matching the design system's status colours. */
export function orderStatusTone(status: string | null | undefined): StatusTone {
  const value = String(status ?? "").toLowerCase().replace(/[_-]+/g, " ");
  if (!value) return "neutral";
  if (/(cancel|reject|fail|refund)/.test(value)) return "danger";
  if (/(deliver(ed)?$|complete|paid|approved)/.test(value) && !/out for/.test(value)) return "success";
  if (/(out for|assign|progress|prepar|picked|transit|confirmed)/.test(value)) return "info";
  if (/(pending|await|review|placed)/.test(value)) return "warning";
  if (/(new|schedul)/.test(value)) return "new";
  return "neutral";
}
