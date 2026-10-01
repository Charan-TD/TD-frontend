import type { Activity, AdminProfile, MenuItem, Metric, Module, UserActivity } from "../models/portal";

/**
 * Signed-out placeholder. It deliberately carries NO name and NO access:
 * the real profile always comes from the authenticated employee (login
 * response or /auth/employee/me). Previously this was a hard-coded
 * "Uday Sir" super-admin with every section, which is what every other
 * employee briefly (or, after a logout, persistently) inherited.
 */
const guestAdmin: AdminProfile = {
  name: "",
  email: "",
  phone: "",
  location: "",
  role: "",
  lastLogin: "",
  access: [],
  permissions: {},
};

const metrics: Metric[] = [
  { label: "Total customers", value: "12,840", trend: "+8.4% this month", icon: "users", tone: "orange" },
  { label: "Orders today", value: "1,248", trend: "+12.6% vs. yesterday", icon: "bag", tone: "indigo" },
  { label: "Active kitchens", value: "43", trend: "5 awaiting approval", icon: "store", tone: "mint" },
  { label: "Platform revenue", value: "₹18.6L", trend: "+16.2% this month", icon: "wallet", tone: "violet" },
];

const modules: Module[] = [
  { id: "users", title: "Users", description: "Accounts, addresses & access", count: "12.8K", icon: "users", tone: "orange" },
  { id: "kitchens", title: "Restaurants", description: "Partners, menus & approval", count: "48", icon: "store", tone: "indigo" },
  { id: "riders", title: "Riders", description: "Profiles, zones & payouts", count: "286", icon: "rider", tone: "mint" },
  { id: "menu", title: "Menu management", description: "Meals, pricing & availability", count: "326", icon: "bag", tone: "violet" },
  { id: "orders", title: "Orders", description: "Live orders & issue handling", count: "1.2K", icon: "bag", tone: "blue" },
  { id: "sales", title: "Sales & payouts", description: "Transactions & settlements", count: "₹18.6L", icon: "wallet", tone: "orange" },
  { id: "activities", title: "Activities", description: "Platform events & audit trail", count: "246", icon: "chart", tone: "mint" },
];

const menu: MenuItem[] = [
  { id: 1, name: "Paneer Butter Masala", kitchen: "Annapurna Kitchen", category: "Dinner", price: "₹220", orders: 184, status: "Live", glyph: "PB" },
  { id: 2, name: "Classic Veg Thali", kitchen: "Daily Dabba Co.", category: "Lunch", price: "₹180", orders: 251, status: "Live", glyph: "VT" },
  { id: 3, name: "Masala Dosa Combo", kitchen: "South Spice", category: "Breakfast", price: "₹145", orders: 132, status: "Live", glyph: "MD" },
  { id: 4, name: "Rajma Chawal Bowl", kitchen: "Ghar Ka Khana", category: "Lunch", price: "₹155", orders: 96, status: "Paused", glyph: "RC" },
  { id: 5, name: "Samosa Chaat", kitchen: "Chaat Junction", category: "Snacks", price: "₹90", orders: 78, status: "Live", glyph: "SC" },
];

const userActivities: UserActivity[] = [
  { id: "active", label: "Currently active users", value: "1,842", description: "Users active on the platform right now", icon: "users", tone: "saffron" },
  { id: "searching", label: "Searching for food", value: "624", description: "Users browsing kitchens and food items", icon: "search", tone: "orange" },
  { id: "payment", label: "At payment stage", value: "318", description: "Orders waiting for payment completion", icon: "wallet", tone: "violet" },
  { id: "waiting", label: "Waiting for order", value: "276", description: "Successful orders awaiting delivery", icon: "bag", tone: "indigo" },
  { id: "cancelled", label: "Cancelled orders", value: "74", description: "Orders cancelled by users or system", icon: "chart", tone: "slate" },
  { id: "successful", label: "Successful orders", value: "1,248", description: "Orders completed successfully today", icon: "check", tone: "mint" },
];

const activities: Activity[] = [
  { title: "New Restaurants registered", detail: "The Rice Bowl · Bengaluru", time: "12 min ago", initials: "TR", tone: "orange" },
  { title: "Settlement completed", detail: "₹48,920 sent to Fresh Feast", time: "38 min ago", initials: "₹", tone: "mint" },
  { title: "Rider verification submitted", detail: "Arjun S. · Documents ready", time: "1 hr ago", initials: "AS", tone: "indigo" },
  { title: "Menu item updated", detail: "Daily Dabba Co. · 6 items changed", time: "2 hr ago", initials: "DD", tone: "orange" },
];

export const adminPortalService = {
  getAdmin: () => ({ ...guestAdmin, access: [], permissions: {} }),
  getMetrics: () => metrics,
  getModules: () => modules,
  getMenu: () => menu,
  getActivities: () => activities,
  getUserActivities: () => userActivities,
};
