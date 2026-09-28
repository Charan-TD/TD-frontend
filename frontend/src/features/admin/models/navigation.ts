export type NavigationSectionId =
  | "dashboard"
  | "users"
  | "employees"
  | "restaurants"
  | "riders"
  | "orders"
  | "stations"
  | "sales"
  | "marketing"
  | "reports";

export type NavigationGroupId = "overview" | "operations" | "business";

export const navigationGroups: { id: NavigationGroupId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "operations", label: "Operations" },
  { id: "business", label: "Business" },
];

export type NavigationItem = {
  id: string;
  label: string;
  icon: "dashboard" | "users" | "store" | "rider" | "bag" | "wallet" | "chart" | "settings" | "check" | "station" | "megaphone" | "file";
  section: NavigationSectionId;
  managementId?: string;
  group?: NavigationGroupId;
};

export const navigationSections: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", section: "dashboard", group: "overview" },
  { id: "users", label: "Users", icon: "users", section: "users", group: "operations" },
  { id: "employees", label: "Employees", icon: "users", section: "employees", group: "operations" },
  { id: "restaurants", label: "Restaurants", icon: "store", section: "restaurants", group: "operations" },
  { id: "riders", label: "Riders", icon: "rider", section: "riders", group: "operations" },
  { id: "orders", label: "Orders", icon: "bag", section: "orders", managementId: "orders", group: "operations" },
  { id: "stations", label: "Stations", icon: "station", section: "stations", managementId: "stations", group: "operations" },
  { id: "sales", label: "Sales", icon: "wallet", section: "sales", group: "business" },
  { id: "marketing", label: "Marketing", icon: "megaphone", section: "marketing", group: "business" },
  { id: "reports", label: "Reports", icon: "file", section: "reports", group: "business" },
];

export const navigationSubsections: Record<NavigationSectionId, NavigationItem[]> = {
  dashboard: [],
  users: [
    { id: "users-all", label: "All Users", icon: "users", section: "users", managementId: "users" },
    { id: "users-blocked", label: "Inactive / Blocked", icon: "users", section: "users", managementId: "users" },
    { id: "users-complaints", label: "Complaints", icon: "users", section: "users", managementId: "users" },
    { id: "users-activity", label: "User Activity", icon: "chart", section: "users", managementId: "users" },
  ],
  employees: [
    { id: "employees-all", label: "Employee List", icon: "users", section: "employees" },
    { id: "employees-roles", label: "Roles & Access", icon: "settings", section: "employees" },
    { id: "employees-activity", label: "Employee Activity", icon: "chart", section: "employees" },
  ],
  restaurants: [
    { id: "restaurants-all", label: "All Restaurants", icon: "store", section: "restaurants", managementId: "restaurants" },
    { id: "restaurants-performance", label: "Performance", icon: "chart", section: "restaurants", managementId: "restaurants" },
    { id: "restaurants-approvals", label: "Approvals", icon: "check", section: "restaurants", managementId: "restaurants" },
    { id: "restaurants-blocked", label: "Inactive / Blocked", icon: "store", section: "restaurants", managementId: "restaurants" },
    { id: "restaurants-complaints", label: "Complaints", icon: "users", section: "restaurants", managementId: "restaurants" },
  ],
  riders: [
    { id: "riders-all", label: "All Riders", icon: "rider", section: "riders", managementId: "riders" },
    { id: "riders-approvals", label: "Applications / Approvals", icon: "check", section: "riders", managementId: "riders" },
    { id: "riders-blocked", label: "Inactive / Blocked", icon: "rider", section: "riders", managementId: "riders" },
    { id: "riders-complaints", label: "Complaints", icon: "users", section: "riders", managementId: "riders" },
  ],
  orders: [
    { id: "orders-all", label: "All Orders", icon: "bag", section: "orders", managementId: "orders" },
    { id: "orders-active", label: "Active Orders", icon: "bag", section: "orders", managementId: "orders" },
    { id: "orders-cancelled", label: "Cancelled Orders", icon: "bag", section: "orders", managementId: "orders" },
  ],
  stations: [
    { id: "stations-all", label: "All Stations", icon: "station", section: "stations", managementId: "stations" },
    { id: "stations-active", label: "Active Stations", icon: "check", section: "stations", managementId: "stations" },
    { id: "stations-inactive", label: "Inactive / Suspended", icon: "station", section: "stations", managementId: "stations" },
    { id: "stations-performance", label: "Station Performance", icon: "chart", section: "stations", managementId: "stations" },
  ],
  sales: [
    { id: "sales-all", label: "Sales Overview", icon: "wallet", section: "sales", managementId: "sales" },
    { id: "sales-payouts", label: "Payments", icon: "wallet", section: "sales", managementId: "sales" },
    { id: "sales-settlements", label: "Settlements", icon: "wallet", section: "sales", managementId: "sales" },
  ],
  marketing: [
    { id: "marketing-offers", label: "Offers", icon: "megaphone", section: "marketing", managementId: "marketing" },
    { id: "marketing-coupons", label: "Coupons", icon: "megaphone", section: "marketing", managementId: "marketing" },
    { id: "marketing-campaigns", label: "Campaigns", icon: "megaphone", section: "marketing", managementId: "marketing" },
    { id: "marketing-analytics", label: "Marketing Analytics", icon: "chart", section: "marketing", managementId: "marketing" },
  ],
  reports: [
    { id: "reports-sales", label: "Sales Reports", icon: "file", section: "reports", managementId: "reports" },
    { id: "reports-orders", label: "Order Reports", icon: "file", section: "reports", managementId: "reports" },
    { id: "reports-users", label: "User Reports", icon: "file", section: "reports", managementId: "reports" },
    { id: "reports-operations", label: "Operational Reports", icon: "file", section: "reports", managementId: "reports" },
  ],
};
