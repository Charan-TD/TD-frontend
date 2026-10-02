import type { PermissionMap } from "./access";

export type Screen = "login" | "dashboard" | "management" | "profile" | "edit-profile" | "employees" | "employee-details" | "assign-role" | "employee-activity";

export type PortalSection = "dashboard" | "users" | "riders" | "restaurants" | "orders" | "sales" | "marketing" | "reports" | "employees" | "stations" | "trains";

export type AdminProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  lastLogin: string;
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

export type Module = {
  id: string;
  title: string;
  description: string;
  count: string;
  icon: "users" | "store" | "rider" | "bag" | "wallet" | "chart";
  tone: "orange" | "indigo" | "mint" | "violet" | "blue" | "slate";
};

export type MenuItem = {
  id: number;
  name: string;
  kitchen: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snacks";
  price: string;
  orders: number;
  status: "Live" | "Paused";
  glyph: string;
};

export type UserActivity = {
  id: string;
  label: string;
  value: string;
  description: string;
  icon: "users" | "search" | "wallet" | "bag" | "check" | "chart";
  tone: "saffron" | "orange" | "indigo" | "violet" | "mint" | "slate";
};

export type Activity = {
  title: string;
  detail: string;
  time: string;
  initials: string;
  tone: "orange" | "indigo" | "mint";
};

