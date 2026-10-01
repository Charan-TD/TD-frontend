import type { PortalSection } from "./portal";

/**
 * Operations the backend understands. `authorize(resource, action)` in
 * backend/middleware/authorize.js only ever checks these four.
 */
export type PermissionAction = "read" | "insert" | "update" | "delete";

/** e.g. { orders: ["read"], riders: ["read", "update"] } */
export type PermissionMap = Record<string, PermissionAction[]>;

export const PORTAL_SECTIONS: PortalSection[] = [
  "dashboard",
  "users",
  "riders",
  "restaurants",
  "orders",
  "sales",
  "marketing",
  "reports",
  "employees",
  "stations",
];

const ACTIONS: readonly string[] = ["read", "insert", "update", "delete"];

/**
 * Splits one permission name into { resource, action }.
 *
 * The database convention is `<resource>_<action>` (orders_read,
 * employee_roles_update). Resource names may contain underscores, so the
 * action is always the LAST segment - the same rule the backend uses when it
 * builds roles.permission_code. `<action>_<resource>` (read_orders) is also
 * accepted so a differently-worded permission row does not silently vanish.
 */
export function parsePermission(
  name: string,
): { resource: string; action: PermissionAction } | null {
  const normalized = name.trim().toLowerCase();

  const last = normalized.lastIndexOf("_");
  if (last > 0) {
    const action = normalized.slice(last + 1);
    if (ACTIONS.includes(action)) {
      return { resource: normalized.slice(0, last), action: action as PermissionAction };
    }
  }

  const first = normalized.indexOf("_");
  if (first > 0) {
    const action = normalized.slice(0, first);
    if (ACTIONS.includes(action)) {
      return { resource: normalized.slice(first + 1), action: action as PermissionAction };
    }
  }

  return null;
}

export function buildPermissionMap(permissionNames: string[] | undefined | null): PermissionMap {
  const map: PermissionMap = {};

  (permissionNames ?? []).forEach((name) => {
    if (typeof name !== "string") return;
    const parsed = parsePermission(name);
    if (!parsed) return;

    const current = map[parsed.resource] ?? [];
    if (!current.includes(parsed.action)) map[parsed.resource] = [...current, parsed.action];
  });

  return map;
}

type AnyPermissionMap = Record<string, readonly string[]>;

export function can(
  map: AnyPermissionMap | undefined,
  resource: string,
  action: PermissionAction,
): boolean {
  return (map?.[resource] ?? []).includes(action);
}

/**
 * A section is visible only when the employee can READ it - opening a
 * section means listing its records. Holding only e.g. `employees_insert`
 * is not enough to open the Employees page.
 */
export function sectionsWithRead(map: AnyPermissionMap): PortalSection[] {
  return PORTAL_SECTIONS.filter((section) => can(map, section, "read"));
}

/**
 * Returns the permission names still missing for a set of requirements.
 * An empty array means the action is allowed.
 */
export function missingPermissions(
  map: AnyPermissionMap | undefined,
  requirements: Array<[resource: string, action: PermissionAction]>,
): string[] {
  return requirements
    .filter(([resource, action]) => !can(map, resource, action))
    .map(([resource, action]) => `${resource}_${action}`);
}
