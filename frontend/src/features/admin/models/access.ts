import type { PortalSection } from "./portal";

/** Backend action names used by authorize(resource, action). */
export type PermissionAction = "read" | "insert" | "update" | "delete";
export type PermissionMap = Record<string, PermissionAction[]>;

export const PORTAL_SECTIONS: PortalSection[] = [
  "dashboard",
  "users",
  "riders",
  "restaurants",
  "orders",
  "sales",
  "employees",
  "stations",
  "trains",
];

const VALID_ACTIONS = new Set<PermissionAction>([
  "read",
  "insert",
  "update",
  "delete",
]);

/**
 * Normalizes the backend action-level permission matrix.
 * Example: { employees: ["read", "insert"], roles: ["read"] }
 */
export function normalizePermissionMap(value: unknown): PermissionMap {
  if (!value) return {};

  // Backward compatibility for sessions created before the backend started
  // returning the action-level matrix. A legacy array only proves section
  // visibility/read access; never infer insert/update/delete from it.
  if (Array.isArray(value)) {
    const legacy: PermissionMap = {};
    value
      .filter((resource): resource is string => typeof resource === "string")
      .map((resource) => resource.trim().toLowerCase())
      .filter(Boolean)
      .forEach((resource) => {
        legacy[resource] = ["read"];
      });
    return legacy;
  }

  if (typeof value !== "object") return {};

  const map: PermissionMap = {};

  Object.entries(value as Record<string, unknown>).forEach(([resource, actions]) => {
    const normalizedResource = resource.trim().toLowerCase();
    if (!normalizedResource || !Array.isArray(actions)) return;

    const normalizedActions = actions
      .filter((action): action is string => typeof action === "string")
      .map((action) => action.trim().toLowerCase())
      .filter((action): action is PermissionAction =>
        VALID_ACTIONS.has(action as PermissionAction),
      );

    map[normalizedResource] = Array.from(new Set(normalizedActions));
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

export function sectionsWithRead(map: AnyPermissionMap): PortalSection[] {
  return PORTAL_SECTIONS.filter((section) => can(map, section, "read"));
}

export function missingPermissions(
  map: AnyPermissionMap | undefined,
  requirements: Array<[resource: string, action: PermissionAction]>,
): string[] {
  return requirements
    .filter(([resource, action]) => !can(map, resource, action))
    .map(([resource, action]) => `${resource}_${action}`);
}
