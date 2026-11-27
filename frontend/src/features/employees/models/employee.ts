export type PortalSection =
  | "dashboard"
  | "users"
  | "employees"
  | "restaurants"
  | "riders"
  | "orders"
  | "stations"
  | "feedback"
  | "sales"
  | "marketing"
  | "reports";

/** In the order the portal shows them (same as the sidebar). */
export const PORTAL_SECTIONS: Array<{
  id: PortalSection;
  label: string;
  description: string;
  icon: "dashboard" | "users" | "employee" | "store" | "rider" | "receipt" | "station" | "star" | "wallet" | "megaphone" | "file";
}> = [
  { id: "dashboard", label: "Dashboard", description: "View the admin dashboard", icon: "dashboard" },
  { id: "users", label: "Users", description: "Manage registered users", icon: "users" },
  { id: "employees", label: "Employees", description: "Manage admin employees and access", icon: "employee" },
  { id: "restaurants", label: "Restaurants", description: "Manage restaurant operations", icon: "store" },
  { id: "riders", label: "Delivery Partners", description: "Manage delivery riders", icon: "rider" },
  { id: "orders", label: "Orders", description: "Manage food orders", icon: "receipt" },
  { id: "stations", label: "Stations", description: "Manage railway stations", icon: "station" },
  { id: "feedback", label: "Feedback", description: "View and respond to customer feedback", icon: "star" },
  { id: "sales", label: "Payments", description: "View sales and payment operations", icon: "wallet" },
  { id: "marketing", label: "Marketing", description: "Manage offers, coupons and campaigns", icon: "megaphone" },
  { id: "reports", label: "Analytics", description: "View sales, order, user and operational reports", icon: "file" },
];

export type AdminPermissionCode =
  | "read"
  | "update"
  | "delete"
  | "insert";

export type PermissionMatrix = Partial<Record<string, AdminPermissionCode[]>>;

export type DbPermission = {
  id: string;
  permission_name: string;
  created_at?: string | null;
};

export type EmployeeStatus =
  | "Active"
  | "Inactive";

export type EmployeeRoleSummary = {
  /** employee_roles row id (the assignment itself). */
  assignmentId: string;
  /** roles.id */
  id: string;
  name: string;
  status: EmployeeStatus;
};

export type Employee = {
  id: string;
  empId: string;
  name: string;
  email: string;

  /**
   * Comma-joined role names (kept for search / legacy display).
   * Use `roles` to render each assigned role individually.
   */
  role: string;
  roleId?: string;

  /**
   * Every role assigned through employee_roles.
   */
  roles: EmployeeRoleSummary[];
  roleIds: string[];

  status: EmployeeStatus;

  /**
   * Actual database permissions assigned
   * through role_permissions.
   */
  permissionIds: string[];

  permissionNames: string[];

  /**
   * Compatibility representation for
   * existing section-based UI.
   */
  permissions: PortalSection[];
  access: PermissionMatrix;

  createdAt: string;

  hasPassword: boolean;
  profileImgUrl?: string | null;
};

/* ============================================================
 * DATABASE TYPES
 * ========================================================== */

export type DbEmployee = {
  id: string;
  emp_id: string;
  name: string;
  email: string;
  status?: string | null;
  password_hash?: string | null;
  profile_img_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DbEmployeeRole = {
  id: string;
  employee_id: string;
  role_id: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DbRole = {
  id: string;
  role_name: string;
  description?: string | null;
  permission_code: PermissionMatrix;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DbRolePermission = {
  id: string;
  role_id: string;
  permission_id: string;
};

/* ============================================================
 * MAPPERS
 * ========================================================== */

export function mapEmployeeStatus(
  status?: string | null
): EmployeeStatus {
  return status?.toLowerCase() ===
    "inactive"
    ? "Inactive"
    : "Active";
}

export function mapMatrixToPortalSections(
  matrix: PermissionMatrix
): PortalSection[] {
  return (
    Object.keys(matrix) as PortalSection[]
  ).filter(
    (section) =>
      (matrix[section] ?? []).length > 0
  );
}
