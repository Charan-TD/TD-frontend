export type NavigationSectionId =
  | "dashboard"
  | "users"
  | "employees"
  | "restaurants"
  | "riders"
  | "orders"
  | "grouporders"
  | "stations"
  | "feedback"
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
  icon: "dashboard" | "employee" | "receipt" | "users" | "store" | "rider" | "bag" | "wallet" | "chart" | "settings" | "check" | "station" | "megaphone" | "file" | "group" | "star";
  section: NavigationSectionId;
  managementId?: string;
  group?: NavigationGroupId;
};

export const navigationSections: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard", section: "dashboard", group: "overview" },
  { id: "users", label: "Users", icon: "users", section: "users", group: "operations" },
  { id: "employees", label: "Employees", icon: "employee", section: "employees", group: "operations" },
  { id: "restaurants", label: "Restaurants", icon: "store", section: "restaurants", group: "operations" },
  { id: "riders", label: "Delivery Partners", icon: "rider", section: "riders", group: "operations" },
  { id: "orders", label: "Orders", icon: "receipt", section: "orders", managementId: "orders", group: "operations" },
  { id: "grouporders", label: "Group Orders", icon: "group", section: "grouporders", managementId: "grouporders", group: "operations" },
  { id: "stations", label: "Stations", icon: "station", section: "stations", managementId: "stations", group: "operations" },
  { id: "feedback", label: "Feedback", icon: "star", section: "feedback", managementId: "feedback", group: "business" },
  { id: "sales", label: "Payments", icon: "wallet", section: "sales", group: "business" },
  { id: "marketing", label: "Marketing", icon: "megaphone", section: "marketing", group: "business" },
  { id: "reports", label: "Analytics", icon: "file", section: "reports", group: "business" },
];

export const navigationSubsections: Record<NavigationSectionId, NavigationItem[]> = {
  dashboard: [],
  users: [
    { id: "users-all", label: "User List", icon: "users", section: "users", managementId: "users" },
    { id: "users-complaints", label: "Complaints", icon: "file", section: "users", managementId: "users" },
    { id: "users-activity", label: "User Activity", icon: "chart", section: "users", managementId: "users" },
  ],
  employees: [
    { id: "employees-all", label: "Employee List", icon: "users", section: "employees" },
    { id: "employees-roles", label: "Roles & Access", icon: "settings", section: "employees" },
    { id: "employees-activity", label: "Employee Activity", icon: "chart", section: "employees" },
  ],
  restaurants: [
    { id: "restaurants-all", label: "All Restaurants", icon: "store", section: "restaurants", managementId: "restaurants" },
    { id: "restaurants-menu", label: "Recommended menu", icon: "file", section: "restaurants", managementId: "restaurants" },
    { id: "restaurants-approvals", label: "Approvals", icon: "check", section: "restaurants", managementId: "restaurants" },
    { id: "restaurants-qty", label: "Quantity types", icon: "settings", section: "restaurants", managementId: "restaurants" },
  ],
  riders: [
    { id: "riders-all", label: "Riders", icon: "rider", section: "riders", managementId: "riders" },
    { id: "riders-handlers", label: "Handlers", icon: "users", section: "riders", managementId: "riders" },
    { id: "riders-approvals", label: "Approvals", icon: "check", section: "riders", managementId: "riders" },
  ],
  orders: [
  ],
  grouporders: [],
  feedback: [
    { id: "feedback-reviews", label: "Reviews", icon: "star", section: "feedback", managementId: "feedback" },
    { id: "feedback-replies", label: "Reply approvals", icon: "check", section: "feedback", managementId: "feedback" },
    { id: "feedback-ratings", label: "Ratings", icon: "star", section: "feedback", managementId: "feedback" },
    { id: "feedback-complaints", label: "Complaints", icon: "file", section: "feedback", managementId: "feedback" },
  ],
  stations: [],
  sales: [
    { id: "sales-all", label: "Transactions", icon: "wallet", section: "sales", managementId: "sales" },
    { id: "sales-payouts", label: "Payouts", icon: "wallet", section: "sales", managementId: "sales" },
    { id: "sales-settlements", label: "Settlements", icon: "wallet", section: "sales", managementId: "sales" },
    { id: "sales-refunds", label: "Refunds", icon: "wallet", section: "sales", managementId: "sales" },
  ],
  marketing: [
    { id: "marketing-offers", label: "Offers", icon: "megaphone", section: "marketing", managementId: "marketing" },
    { id: "marketing-coupons", label: "Coupons", icon: "megaphone", section: "marketing", managementId: "marketing" },
    { id: "marketing-campaigns", label: "Campaigns", icon: "megaphone", section: "marketing", managementId: "marketing" },
  ],
  reports: [
    { id: "reports-sales", label: "Sales", icon: "file", section: "reports", managementId: "reports" },
    { id: "reports-orders", label: "Orders", icon: "file", section: "reports", managementId: "reports" },
    { id: "reports-users", label: "Users", icon: "file", section: "reports", managementId: "reports" },
    { id: "reports-operations", label: "Operations", icon: "file", section: "reports", managementId: "reports" },
    { id: "reports-restaurants", label: "Restaurant performance", icon: "chart", section: "reports", managementId: "reports" },
    { id: "reports-stations", label: "Station performance", icon: "chart", section: "reports", managementId: "reports" },
    { id: "reports-marketing", label: "Marketing performance", icon: "chart", section: "reports", managementId: "reports" },
  ],
};
