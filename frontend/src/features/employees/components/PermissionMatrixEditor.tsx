"use client";

import { useMemo, useState } from "react";

import { Icon } from "../../admin/components/Icon";
import { SidePanel } from "../../admin/components/SidePanel";
import {
  PORTAL_SECTIONS,
  type AdminPermissionCode,
  type DbPermission,
  type PermissionMatrix,
} from "../models/employee";

const STANDARD_OPERATIONS: Array<{ key: AdminPermissionCode; label: string }> = [
  { key: "read", label: "Read" },
  { key: "insert", label: "Insert" },
  { key: "update", label: "Update" },
  { key: "delete", label: "Delete" },
];

type Props = {
  value: PermissionMatrix;
  permissions: DbPermission[];
  onChange: (matrix: PermissionMatrix) => void;
  disabled?: boolean;
};

function titleizeResource(resource: string) {
  return resource
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function PermissionMatrixEditor({
  value,
  permissions,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const portalMeta = new Map(PORTAL_SECTIONS.map((item) => [item.id, item]));
    const portalOrder = new Map(PORTAL_SECTIONS.map((item, index) => [item.id, index]));

    return permissions
      .map((permission) => {
        const resource = permission.permission_name.trim().toLowerCase();
        const meta = portalMeta.get(resource as (typeof PORTAL_SECTIONS)[number]["id"]);

        return {
          permission,
          resource,
          label: meta?.label ?? titleizeResource(resource),
          description:
            meta?.description ?? `Manage ${titleizeResource(resource).toLowerCase()} permissions`,
          order: portalOrder.get(resource as (typeof PORTAL_SECTIONS)[number]["id"]) ?? 1000,
        };
      })
      .filter((row) => row.resource.length > 0)
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [permissions]);

  const selectedResources = Object.entries(value).filter(
    (entry): entry is [string, AdminPermissionCode[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );
  const selectedActionCount = selectedResources.reduce((sum, [, actions]) => sum + actions.length, 0);

  const toggleAction = (resource: string, action: AdminPermissionCode) => {
    if (disabled) return;

    const existing = value[resource] ?? [];
    const nextActions = existing.includes(action)
      ? existing.filter((item) => item !== action)
      : [...existing, action];

    const next: PermissionMatrix = { ...value };
    if (nextActions.length === 0) {
      delete next[resource];
    } else {
      next[resource] = nextActions;
    }

    onChange(next);
  };

  const toggleAllForResource = (resource: string) => {
    if (disabled) return;

    const current = value[resource] ?? [];
    const allSelected = STANDARD_OPERATIONS.every((operation) => current.includes(operation.key));
    const next: PermissionMatrix = { ...value };

    if (allSelected) {
      delete next[resource];
    } else {
      next[resource] = STANDARD_OPERATIONS.map((operation) => operation.key);
    }

    onChange(next);
  };

  const clearAll = () => {
    if (!disabled) onChange({});
  };

  return (
    <div className="access-selector">
      <div className="access-selector-header">
        <div>
          <strong>Permissions</strong>
          <p>Select a backend resource and the exact actions this role can perform.</p>
        </div>
        <span>{selectedResources.length} resources · {selectedActionCount} actions</span>
      </div>

      <div className="access-selector-summary">
        <div className="access-pills">
          {selectedResources.length === 0 && (
            <span className="access-pills-empty">No permissions selected</span>
          )}
          {selectedResources.map(([resource, actions]) => (
            <span key={resource}>
              {titleizeResource(resource)}: {actions.join(", ")}
            </span>
          ))}
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setOpen(true)}
        >
          <Icon name="settings" size={14} />
          {disabled ? "View permissions" : "Configure permissions"}
        </button>
      </div>

      <SidePanel
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="PERMISSIONS"
        title="Configure permissions"
        description="Choose resource-level actions exactly as the backend expects: read, insert, update and delete."
        elevated
        widthVariant="wide"
        footer={
          <button type="button" className="primary-button" onClick={() => setOpen(false)}>
            Done
          </button>
        }
      >
        <div className="matrix-toolbar">
          <span>{selectedResources.length} of {rows.length} resources selected</span>
          {!disabled && (
            <button type="button" className="text-button" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        <div className="matrix-grid matrix-grid--accordion">
          {rows.map(({ permission, resource, label, description }) => {
            const current = value[resource] ?? [];
            const allSelected = STANDARD_OPERATIONS.every((operation) =>
              current.includes(operation.key),
            );

            return (
              <article key={permission.id} className="matrix-row">
                <div className="matrix-row-top">
                  <div className="matrix-section">
                    <span>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </span>
                  </div>

                  <label className="matrix-select-all">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={disabled}
                      onChange={() => toggleAllForResource(resource)}
                    />
                    <span>Select All</span>
                  </label>
                </div>

                <div className="matrix-operations-collapse is-open">
                  <div className="matrix-operations">
                    {STANDARD_OPERATIONS.map((operation) => {
                      const checked = current.includes(operation.key);
                      return (
                        <label
                          key={operation.key}
                          className={`matrix-op ${checked ? "is-checked" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleAction(resource, operation.key)}
                          />
                          <span>{operation.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}

          {rows.length === 0 && (
            <div className="api-state">No permission resources were returned by the backend.</div>
          )}
        </div>
      </SidePanel>
    </div>
  );
}
