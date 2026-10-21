export type ApprovalStatus = "pending" | "approved" | "rejected";

export const STATUS_FILTERS: { id: ApprovalStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const str = (value: unknown): string => {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const errorMessage = (error: unknown): string => {
  const { status, data } = (error ?? {}) as { status?: number | string; data?: { message?: string } };
  return [status, data?.message].filter(Boolean).join(" — ") || "Something went wrong. Please try again.";
};
