"use client";

import { useMemo, useState } from "react";

import { Icon } from "../../admin/components/Icon";
import { SidePanel } from "../../admin/components/SidePanel";

import {
  PORTAL_SECTIONS,
  type AdminPermissionCode,
  type DbPermission,
} from "../models/employee";

import {
  getPermissionLabel,
  getPermissionOperation,
  getPermissionSection,
} from "../models/permissions";

type CreatePermissionResult = {
  success: boolean;
  permission?: DbPermission;
};

type Props = {
  value: string[];
  permissions: DbPermission[];
  onChange: (permissionIds: string[]) => void;
  disabled?: boolean;
  /**
   * Lets the admin add a permission that is not already listed
   * (a missing standard operation for a section, or a fully
   * custom permission name).
   */
  onCreatePermission?: (permissionName: string) => Promise<CreatePermissionResult>;
  isCreatingPermission?: boolean;
};

/**
 * The four standard operations every section can be granted.
 * The last one is spelled "insert" (rather than "create") to
 * match the naming the admin uses for this permission type.
 */
const STANDARD_OPERATIONS: Array<{
  key: AdminPermissionCode;
  label: string;
}> = [
    { key: "read", label: "Read" },
    { key: "insert", label: "Insert" },
    { key: "update", label: "Update" },
    { key: "delete", label: "Delete" },
  ];

export function PermissionMatrixEditor({
  value,
  permissions,
  onChange,
  disabled = false,
  onCreatePermission,
  isCreatingPermission = false,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const [
    customInputs,
    setCustomInputs,
  ] = useState<Record<string, string>>({});

  const [
    pendingKey,
    setPendingKey,
  ] = useState<string | null>(null);

  const [
    createError,
    setCreateError,
  ] = useState("");

  const selected = new Set(value);

  const knownSectionIds =
    PORTAL_SECTIONS.map(
      (item) => item.id
    );

  const groupedPermissions =
    useMemo(() => {
      const groups =
        new Map<
          string,
          DbPermission[]
        >();

      permissions.forEach(
        (permission) => {
          const section =
            getPermissionSection(
              permission.permission_name,
              knownSectionIds
            );

          const groupName =
            section ?? "other";

          const current =
            groups.get(
              groupName
            ) ?? [];

          groups.set(
            groupName,
            [
              ...current,
              permission,
            ]
          );
        }
      );

      return groups;
    }, [permissions]);

  // Every portal section gets its own row, even when it has no
  // permissions configured yet, so the admin can add its first one.
  const sectionRows = PORTAL_SECTIONS.map((section) => ({
    section,
    sectionPermissions: groupedPermissions.get(section.id) ?? [],
  }));

  const otherPermissions = groupedPermissions.get("other") ?? [];

  const togglePermission = (
    permissionId: string
  ) => {
    const next = new Set(
      selected
    );

    if (
      next.has(permissionId)
    ) {
      next.delete(
        permissionId
      );
    } else {
      next.add(
        permissionId
      );
    }

    onChange(
      Array.from(next)
    );
  };

  const toggleSelectAllForSection = (
    sectionPermissions: DbPermission[]
  ) => {
    const standardPermissionIds =
      sectionPermissions
        .filter((permission) => {
          const operation =
            getPermissionOperation(
              permission.permission_name
            );

          return STANDARD_OPERATIONS.some(
            (item) =>
              item.key === operation
          );
        })
        .map(
          (permission) =>
            permission.id
        );

    if (
      standardPermissionIds.length === 0
    ) {
      return;
    }

    const allSelected =
      standardPermissionIds.every(
        (permissionId) =>
          selected.has(permissionId)
      );

    const next = new Set(
      selected
    );

    if (allSelected) {
      standardPermissionIds.forEach(
        (permissionId) =>
          next.delete(permissionId)
      );
    } else {
      standardPermissionIds.forEach(
        (permissionId) =>
          next.add(permissionId)
      );
    }

    onChange(
      Array.from(next)
    );
  };

  const isSectionSelectAllChecked = (
    sectionPermissions: DbPermission[]
  ) => {
    const standardPermissionIds =
      sectionPermissions
        .filter((permission) => {
          const operation =
            getPermissionOperation(
              permission.permission_name
            );

          return STANDARD_OPERATIONS.some(
            (item) =>
              item.key === operation
          );
        })
        .map(
          (permission) =>
            permission.id
        );

    return (
      standardPermissionIds.length > 0 &&
      standardPermissionIds.every(
        (permissionId) =>
          selected.has(permissionId)
      )
    );
  };

  const clearAll = () => {
    onChange([]);
  };

  const addAndSelectPermission = async (permissionName: string, pendingId: string) => {
    if (!onCreatePermission || disabled) return;

    setCreateError("");
    setPendingKey(pendingId);

    const result = await onCreatePermission(permissionName);

    setPendingKey(null);

    if (!result.success || !result.permission) {
      setCreateError(`Could not add "${permissionName}".`);
      return;
    }

    const next = new Set(selected);
    next.add(result.permission.id);
    onChange(Array.from(next));
  };

  const handleQuickAdd = (sectionId: string, operationKey: string) => {
    const permissionName = `${sectionId}_${operationKey}`;
    void addAndSelectPermission(permissionName, permissionName);
  };

  const handleCustomAdd = (groupKey: string, prefix?: string) => {
    const raw = (customInputs[groupKey] ?? "").trim();
    if (!raw) return;

    const permissionName = prefix && !raw.toLowerCase().startsWith(`${prefix}_`) ? `${prefix}_${raw}` : raw;

    void addAndSelectPermission(permissionName, `custom-${groupKey}`).then(() => {
      setCustomInputs((current) => ({ ...current, [groupKey]: "" }));
    });
  };

  return (
    <div className="access-selector">
      <div className="access-selector-header">
        <div>
          <strong>
            Permissions
          </strong>

          <p>
            Select permissions from the
            permissions configured in the
            database.
          </p>
        </div>

        <span>
          {value.length} selected
        </span>
      </div>

      <div className="access-selector-summary">
        <div className="access-pills">
          {value.length === 0 && (
            <span className="access-pills-empty">
              No permissions selected
            </span>
          )}

          {permissions
            .filter((permission) =>
              selected.has(
                permission.id
              )
            )
            .map((permission) => (
              <span
                key={permission.id}
              >
                {getPermissionLabel(
                  permission.permission_name
                )}
              </span>
            ))}
        </div>

        <button
          type="button"
          className="secondary-button"
          disabled={disabled}
          onClick={() =>
            setOpen(true)
          }
        >
          <Icon
            name="settings"
            size={14}
          />
          Configure permissions
        </button>
      </div>

      <SidePanel
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="PERMISSIONS"
        title="Configure permissions"
        description="Choose which operations are allowed per section. Permissions shown here are loaded from the database."
        elevated
        widthVariant="wide"
        footer={
          <button type="button" className="primary-button" onClick={() => setOpen(false)}>
            Done
          </button>
        }
      >
        <div className="matrix-toolbar">
          <span>
            {value.length} of{" "}
            {permissions.length}{" "}
            permissions selected
          </span>

          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={clearAll}
          >
            Clear all
          </button>
        </div>

        {createError && (
          <div className="api-state api-state--error">{createError}</div>
        )}

        <div className="matrix-grid matrix-grid--accordion">
          {sectionRows.map(({ section, sectionPermissions }) => {
            const existingOperationKeys = new Set(
              sectionPermissions
                .map((permission) =>
                  getPermissionOperation(permission.permission_name)
                )
                .filter(Boolean)
            );

            const missingOperations = STANDARD_OPERATIONS.filter(
              (operation) => !existingOperationKeys.has(operation.key)
            );

            const hasStandardPermissions =
              sectionPermissions.some((permission) => {
                const operation =
                  getPermissionOperation(
                    permission.permission_name
                  );

                return STANDARD_OPERATIONS.some(
                  (item) =>
                    item.key === operation
                );
              });

            return (
              <article
                key={section.id}
                className="matrix-row"
              >
                <div className="matrix-row-top">
                  <div className="matrix-section">
                    <span>
                      <strong>
                        {section.label}
                      </strong>

                      <small>
                        {section.description}
                      </small>
                    </span>
                  </div>

                  {hasStandardPermissions && (
                    <label className="matrix-select-all">
                      <input
                        type="checkbox"
                        checked={isSectionSelectAllChecked(
                          sectionPermissions
                        )}
                        disabled={disabled}
                        onChange={() =>
                          toggleSelectAllForSection(
                            sectionPermissions
                          )
                        }
                      />

                      <span>
                        Select All
                      </span>
                    </label>
                  )}
                </div>

                <div className="matrix-operations-collapse is-open">
                  <div className="matrix-operations">
                    {sectionPermissions.length === 0 && (
                      <span className="matrix-operations-empty">No permissions yet for this section.</span>
                    )}

                    {sectionPermissions.map(
                      (permission) => {
                        const checked =
                          selected.has(
                            permission.id
                          );

                        return (
                          <label
                            key={
                              permission.id
                            }
                            className={`matrix-op ${checked
                              ? "is-checked"
                              : ""
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={
                                checked
                              }
                              disabled={
                                disabled
                              }
                              onChange={() =>
                                togglePermission(
                                  permission.id
                                )
                              }
                            />

                            <span>
                              {getPermissionLabel(
                                permission.permission_name
                              )}
                            </span>
                          </label>
                        );
                      }
                    )}

                    {!disabled && onCreatePermission && missingOperations.map((operation) => {
                      const permissionName = `${section.id}_${operation.key}`;
                      const isPending = pendingKey === permissionName;

                      return (
                        <button
                          key={operation.key}
                          type="button"
                          className="matrix-op matrix-op--add"
                          onClick={() => handleQuickAdd(section.id, operation.key)}
                          disabled={isPending}
                        >
                          <Icon name="plus" size={11} />
                          <span>{isPending ? "Adding…" : operation.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {!disabled && onCreatePermission && (
                    <div className="matrix-add-custom">
                      <input
                        value={customInputs[section.id] ?? ""}
                        onChange={(event) =>
                          setCustomInputs((current) => ({ ...current, [section.id]: event.target.value }))
                        }
                        placeholder="Custom permission (e.g. approve, assign)"
                        aria-label={`Add a custom permission for ${section.label}`}
                      />

                      <button
                        type="button"
                        className="text-button"
                        disabled={!customInputs[section.id]?.trim() || pendingKey === `custom-${section.id}`}
                        onClick={() => handleCustomAdd(section.id, section.id)}
                      >
                        {pendingKey === `custom-${section.id}` ? "Adding…" : "+ Add"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {otherPermissions.length > 0 && (
            <article className="matrix-row">
              <div className="matrix-row-top">
                <div className="matrix-section">
                  <span>
                    <strong>
                      Other Permissions
                    </strong>
                  </span>
                </div>
              </div>

              <div className="matrix-operations-collapse is-open">
                <div className="matrix-operations">
                  {otherPermissions.map((permission) => {
                    const checked = selected.has(permission.id);

                    return (
                      <label
                        key={permission.id}
                        className={`matrix-op ${checked ? "is-checked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => togglePermission(permission.id)}
                        />

                        <span>{getPermissionLabel(permission.permission_name)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </article>
          )}

          {!onCreatePermission && !permissions.length && (
            <div className="api-state">
              No permissions are configured
              in the database.
            </div>
          )}

          {!disabled && onCreatePermission && (
            <article className="matrix-row matrix-row--custom">
              <div className="matrix-row-top">
                <div className="matrix-section">
                  <span>
                    <strong>Add a fully custom permission</strong>
                    <small>Not tied to the sections above (e.g. a one-off permission name).</small>
                  </span>
                </div>
              </div>

              <div className="matrix-add-custom">
                <input
                  value={customInputs.custom ?? ""}
                  onChange={(event) => setCustomInputs((current) => ({ ...current, custom: event.target.value }))}
                  placeholder="e.g. reports_export"
                  aria-label="Add a custom permission name"
                />

                <button
                  type="button"
                  className="text-button"
                  disabled={!customInputs.custom?.trim() || pendingKey === "custom-custom"}
                  onClick={() => handleCustomAdd("custom")}
                >
                  {pendingKey === "custom-custom" ? "Adding…" : "+ Add"}
                </button>
              </div>
            </article>
          )}
        </div>
      </SidePanel>
    </div>
  );
}