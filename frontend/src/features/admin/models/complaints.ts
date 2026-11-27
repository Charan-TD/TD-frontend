export type ComplaintStatus = "open" | "in_progress" | "resolved";
export type ComplaintKind = "customer" | "restaurant";

export type Complaint = {
  id: string;
  kind: ComplaintKind;
  subject: string;
  description: string;
  /** Who raised it. */
  customerName: string;
  customerId?: string;
  /** Restaurant complaints only: the restaurant it is about. */
  restaurantName?: string;
  orderNumber?: string;
  /** ISO date. */
  raisedAt: string;
  status: ComplaintStatus;
  reply?: string;
};

export const complaintStatusLabel: Record<ComplaintStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};
