import type {
  AdminPermissionCode,
  PermissionMatrix,
  PortalSection,
} from "./employee";

export type Permission = {
  id: string;
  permission_name: string;
  created_at?: string | null;
};

/**
 * These operation labels are only used when a database permission
 * follows a conventional name such as:
 *
 * users_read
 * users_create
 * restaurants_update
 *
 * They are NOT the database source of truth.
 */
export const OPERATION_LABELS: Record<string, string> = {
  read: "Read",
  insert: "Create",
  update: "Update",
  delete: "Delete",
};

export const OPERATION_ORDER = [
  "read",
  "insert",
  "update",
  "delete",
] as const;

/**
 * Converts a permission name into a readable label.
 *
 * Example:
 * "users_read" -> "Read"
 * "approve_restaurant" -> "Approve Restaurant"
 * "custom_permission" -> "Custom Permission"
 */
export function getPermissionLabel(
  permissionName: string
): string {
  const normalized = permissionName
    .trim()
    .toLowerCase();

  const parts = normalized.split("_");

  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];

    if (OPERATION_LABELS[lastPart]) {
      return OPERATION_LABELS[lastPart];
    }
  }

  return permissionName
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/**
 * Attempts to determine a portal section from a permission name.
 *
 * This is only a UI convenience.
 * The permission database record itself remains the source of truth.
 */
export function getPermissionSection(
  permissionName: string,
  sections: PortalSection[]
): PortalSection | null {
  const normalized = permissionName
    .trim()
    .toLowerCase();

  const matchedSection = sections.find(
    (section) =>
      normalized === section ||
      normalized.startsWith(`${section}_`) ||
      normalized.startsWith(`${section}-`)
  );

  return matchedSection ?? null;
}

/**
 * Attempts to determine the operation represented by a permission.
 *
 * Returns null for custom permissions that do not follow the
 * conventional naming format.
 */
export function getPermissionOperation(
  permissionName: string
): AdminPermissionCode | null {
  const normalized = permissionName
    .trim()
    .toLowerCase();

  const parts = normalized.split("_");

  if (parts.length < 2) {
    return null;
  }

  const operation = parts[parts.length - 1];

  if (
    operation === "read" ||
    operation === "insert" ||
    operation === "update" ||
    operation === "delete"
  ) {
    return operation;
  }

  return null;
}

/**
 * Creates the old PermissionMatrix representation only for
 * permissions that can be understood as:
 *
 * section_operation
 *
 * This keeps existing employee details/read-only UI compatible.
 */
export function normalizePermissionMatrix(
  permissions: Permission[] | unknown
): PermissionMatrix {
  if (!Array.isArray(permissions)) {
    return {};
  }

  const result: PermissionMatrix = {};

  const knownSections: PortalSection[] = [
    "dashboard",
    "users",
    "employees",
    "restaurants",
    "riders",
    "orders",
    "stations",
    "sales",
    "marketing",
    "reports",
  ];

  permissions.forEach((permission) => {
    if (
      !permission ||
      typeof permission !== "object"
    ) {
      return;
    }

    const record =
      permission as {
        permission_name?: unknown;
      };

    if (
      typeof record.permission_name !==
      "string"
    ) {
      return;
    }

    const section =
      getPermissionSection(
        record.permission_name,
        knownSections
      );

    const operation =
      getPermissionOperation(
        record.permission_name
      );

    if (!section || !operation) {
      return;
    }

    const normalizedOperation = operation

    const current: AdminPermissionCode[] =
      result[section] ?? [];

    if (!current.includes(normalizedOperation)) {
      result[section] = [
        ...current,
        normalizedOperation,
      ];
    }
  });

  return result;
}

export function grantedSections(
  matrix: PermissionMatrix
): PortalSection[] {
  return (
    Object.keys(matrix) as PortalSection[]
  ).filter(
    (section) =>
      (matrix[section] ?? []).length > 0
  );
}

export function can(
  matrix: PermissionMatrix,
  section: PortalSection,
  operation: string
): boolean {
  return (
    matrix[section] ?? []
  ).includes(operation as never);
}

export function canView(
  matrix: PermissionMatrix,
  section: PortalSection
): boolean {
  return (
    matrix[section] ?? []
  ).length > 0;
}

export function toggleSection(
  matrix: PermissionMatrix,
  section: PortalSection
): PermissionMatrix {
  const next = {
    ...matrix,
  };

  if (
    (next[section] ?? []).length > 0
  ) {
    delete next[section];
  } else {
    next[section] = ["read"];
  }

  return next;
}

export function toggleOperation(
  matrix: PermissionMatrix,
  section: PortalSection,
  operation:
    | "read"
    | "update"
    | "delete"
    | "insert"
): PermissionMatrix {
  const next = {
    ...matrix,
  };

  const current = [
    ...(next[section] ?? []),
  ];

  if (current.includes(operation)) {
    const updated =
      current.filter(
        (item) => item !== operation
      );

    if (updated.length === 0) {
      delete next[section];
    } else {
      next[section] = updated;
    }

    return next;
  }

  next[section] = [
    ...current,
    operation,
  ];

  return next;
}

export function describeMatrix(
  matrix: PermissionMatrix
): string {
  const sections =
    grantedSections(matrix);

  if (sections.length === 0) {
    return "No portal access";
  }

  return sections.join(", ");
}

export function countGrants(
  matrix: PermissionMatrix
): number {
  return Object.values(matrix).reduce(
    (total, operations) =>
      total +
      (operations?.length ?? 0),
    0
  );
}
/**
 * Some sections need extra, behind-the-scenes access to work. Admins
 * shouldn't have to grant those one by one, so each linked resource
 * always gets exactly the actions ticked for its section, and is hidden
 * from the permission editor.
 *
 * To bundle access for another section, add an entry here, e.g.
 *   restaurants: {
 *     linked: ["restaurant_menus", "restaurant_documents"],
 *     note: "Also covers menus and documents.",
 *   },
 * Then every place that saves a role picks it up.
 */
export const SECTION_LINKED_ACCESS: Record<
  string,
  { linked: readonly string[]; note: string }
> = {
  employees: {
    // Assigning roles, editing roles and reading the permission list.
    linked: ["employee_roles", "roles", "permissions"],
    note: "Also lets them assign roles and set up role access.",
  },
};

const LINKED_RESOURCES = new Set(
  Object.values(SECTION_LINKED_ACCESS).flatMap((entry) => entry.linked)
);

/** True for a resource that follows another section (see SECTION_LINKED_ACCESS). */
export function isLinkedResource(resource: string): boolean {
  return LINKED_RESOURCES.has(resource);
}

/** The extra line shown under a section in the editor, if it bundles access. */
export function linkedAccessNote(section: string): string | undefined {
  return SECTION_LINKED_ACCESS[section]?.note;
}

/**
 * Copies each section's actions onto its linked resources, replacing
 * whatever they had, so saving a role grants them together.
 */
export function withLinkedAccess(
  matrix: PermissionMatrix
): PermissionMatrix {
  const next: PermissionMatrix = { ...matrix };

  Object.entries(SECTION_LINKED_ACCESS).forEach(([section, { linked }]) => {
    const actions = matrix[section] ?? [];

    linked.forEach((resource) => {
      if (actions.length > 0) {
        next[resource] = [...actions];
      } else {
        delete next[resource];
      }
    });
  });

  return next;
}

/**
 * Sections that exist in the database but aren't in use yet. They are left
 * out of the role editor, role summaries and anything saved on a role.
 * Remove a name from this list to bring that section back.
 */
export const PAUSED_SECTIONS: readonly string[] = ["trains"];

export function isPausedSection(resource: string): boolean {
  return PAUSED_SECTIONS.includes(resource);
}

/** Plain-language names for the four actions, as admins see them. */
export const ACTION_DISPLAY_LABELS: Record<string, string> = {
  read: "View",
  insert: "Add",
  update: "Edit",
  delete: "Delete",
};

/** e.g. ["read", "insert"] -> "View, Add" */
export function describeActions(actions: readonly string[] | undefined): string {
  return (actions ?? [])
    .map((action) => ACTION_DISPLAY_LABELS[action] ?? action)
    .join(", ");
}

/** e.g. "delivery_partners" -> "Delivery Partners" */
export function sectionDisplayName(resource: string): string {
  return resource
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
