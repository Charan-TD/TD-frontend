export type PortalSection =
  | "dashboard"
  | "users"
  | "employees"
  | "restaurants"
  | "riders"
  | "orders"
  | "stations"
  | "sales"
  | "trains";

export const PORTAL_SECTIONS: Array<{
  id: PortalSection;
  label: string;
  description: string;
}> = [
    {
      id: "dashboard",
      label: "Dashboard",
      description: "View the admin dashboard",
    },
    {
      id: "users",
      label: "Users",
      description: "Manage registered users",
    },
    {
      id: "employees",
      label: "Employees",
      description:
        "Manage admin employees and access",
    },
    {
      id: "restaurants",
      label: "Restaurants",
      description:
        "Manage restaurant operations",
    },
    {
      id: "riders",
      label: "Riders",
      description:
        "Manage delivery riders",
    },
    {
      id: "orders",
      label: "Orders",
      description:
        "Manage food orders",
    },
    {
      id: "stations",
      label: "Stations",
      description:
        "Manage railway stations",
    },
    {
      id: "sales",
      label: "Sales",
      description:
        "View sales and payment operations",
    },
    {
      id: "trains",
      label: "Trains",
      description:
        "Manage train information",
    },
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