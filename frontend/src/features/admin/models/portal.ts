import type { PermissionMap } from "./access";

export type Screen = "login" | "dashboard" | "management" | "profile" | "edit-profile" | "employees" | "employee-details" | "assign-role" | "employee-activity";

export type PortalSection = "dashboard" | "users" | "riders" | "restaurants" | "orders" | "sales" | "marketing" | "reports" | "employees" | "stations";

export type AdminProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  /** Sections the employee may open according to the backend resource permission list. */
  access: PortalSection[];
  /** Full operation map, e.g. { orders: ["read"], riders: ["read","update"] }. */
  permissions: PermissionMap;
  /** Set once a real session is loaded. Empty for the signed-out guest profile. */
  employeeId?: string;
};

export type Metric = {
  label: string;
  value: string;
  trend: string;
  icon: "users" | "bag" | "store" | "wallet" | "chart" | "megaphone" | "station";
  tone: "orange" | "indigo" | "mint" | "violet";
};
