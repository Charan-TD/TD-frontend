"use client";

import { useMemo, useState } from "react";

import { Icon } from "../../admin/components/Icon";
import { SidePanel } from "../../admin/components/SidePanel";
import { noAccess } from "../../admin/models/disabledReason";
import { useCreatePermissionMutation } from "../api/rolesApi";
import { getErrorMessage } from "../viewmodels/assignRoleViewModel";
import {
  PORTAL_SECTIONS,
  type AdminPermissionCode,
  type DbPermission,
  type PermissionMatrix,
} from "../models/employee";
import {
  ACTION_DISPLAY_LABELS,
  describeActions,
  isLinkedResource,
  isPausedSection,
  linkedAccessNote,
  sectionDisplayName,
} from "../models/permissions";

const STANDARD_OPERATIONS: Array<{ key: AdminPermissionCode; label: string }> = [
  { key: "read", label: ACTION_DISPLAY_LABELS.read },
  { key: "insert", label: ACTION_DISPLAY_LABELS.insert },
  { key: "update", label: ACTION_DISPLAY_LABELS.update },
  { key: "delete", label: ACTION_DISPLAY_LABELS.delete },
];

type Props = {
  value: PermissionMatrix;
  permissions: DbPermission[];
  onChange: (matrix: PermissionMatrix) => void;
  disabled?: boolean;
  /**
   * Whether the signed-in person may add permission rows. Sections the app
   * knows about but the database doesn't have yet (e.g. a new Marketing
   * section) can then be set up straight from the editor.
   */
  canSetUpSections?: boolean;
};

export function PermissionMatrixEditor({
  value,
  permissions,
  onChange,
  disabled = false,
  canSetUpSections = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [createPermission] = useCreatePermissionMutation();
  const [settingUp, setSettingUp] = useState<string | null>(null);
  const [setUpError, setSetUpError] = useState("");

  // App sections with no permission row in the database yet, so no role can
  // be given access to them until they are set up.
  const sectionsNotSetUp = useMemo(() => {
    const existing = new Set(
      permissions.map((permission) => permission.permission_name.trim().toLowerCase()),
    );
    return PORTAL_SECTIONS.filter(
      (section) => !existing.has(section.id) && !isPausedSection(section.id),
    );
  }, [permissions]);

  const setUpSection = async (sectionId: string) => {
    setSetUpError("");
    setSettingUp(sectionId);
    try {
      // The new row appears in the list above once permissions reload.
      await createPermission({ permissionName: sectionId }).unwrap();
    } catch (error) {
      setSetUpError(getErrorMessage(error));
    } finally {
      setSettingUp(null);
    }
  };

  const rows = useMemo(() => {
    const portalMeta = new Map(PORTAL_SECTIONS.map((item) => [item.id, item]));
    const portalOrder = new Map(PORTAL_SECTIONS.map((item, index) => [item.id, index]));

    return permissions
      .map((permission) => {
        const resource = permission.permission_name.trim().toLowerCase();
        const meta = portalMeta.get(resource as (typeof PORTAL_SECTIONS)[number]["id"]);

        const baseDescription =
          meta?.description ?? `Manage ${sectionDisplayName(resource).toLowerCase()}`;
        const note = linkedAccessNote(resource);

        return {
          permission,
          resource,
          label: meta?.label ?? sectionDisplayName(resource),
          description: note ? `${baseDescription}. ${note}` : baseDescription,
          order: portalOrder.get(resource as (typeof PORTAL_SECTIONS)[number]["id"]) ?? 1000,
        };
      })
      // Linked access follows its section's row automatically.
      .filter(
        (row) =>
          row.resource.length > 0 && !isLinkedResource(row.resource) && !isPausedSection(row.resource),
      )
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [permissions]);

  const selectedResources = Object.entries(value).filter(
    (entry): entry is [string, AdminPermissionCode[]] =>
      !isLinkedResource(entry[0]) &&
      !isPausedSection(entry[0]) &&
      Array.isArray(entry[1]) &&
      entry[1].length > 0,
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
          <p>Choose what this role can see and do in each section.</p>
        </div>
        <span>{selectedResources.length} sections · {selectedActionCount} actions</span>
      </div>

      <div className="access-selector-summary">
        <div className="access-pills">
          {selectedResources.length === 0 && (
            <span className="access-pills-empty">No permissions selected</span>
          )}
          {selectedResources.map(([resource, actions]) => (
            <span key={resource}>
              {sectionDisplayName(resource)}: {describeActions(actions)}
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
        description="Tick what this role can do in each section: view, add, edit or delete."
        elevated
        widthVariant="wide"
        footer={
          <button type="button" className="primary-button" onClick={() => setOpen(false)}>
            Done
          </button>
        }
      >
        <div className="matrix-toolbar">
          <span>{selectedResources.length} of {rows.length} sections selected</span>
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
            <div className="api-state">No sections are available to set up yet.</div>
          )}
        </div>

        {!disabled && sectionsNotSetUp.length > 0 && (
          <div className="matrix-not-set-up">
            <div className="matrix-not-set-up__header">
              <strong>Not set up yet</strong>
              <p>
                These sections exist in the portal but can't be given to a role until
                they are set up. Setting one up makes it available for every role.
              </p>
            </div>

            {setUpError && <div className="api-state api-state--error">{setUpError}</div>}

            {sectionsNotSetUp.map((section) => {
              const isPending = settingUp === section.id;
              return (
                <div key={section.id} className="matrix-not-set-up__row">
                  <span>
                    <strong>{section.label}</strong>
                    <small>{section.description}</small>
                  </span>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setUpSection(section.id)}
                    disabled={!canSetUpSections || settingUp !== null}
                    data-tooltip={
                      !canSetUpSections
                        ? noAccess("set up new sections")
                        : settingUp !== null
                          ? "Please wait, a section is being set up"
                          : `Make ${section.label} available to give to roles`
                    }
                    data-tooltip-kind={canSetUpSections ? undefined : "access"}
                    data-tooltip-icon={canSetUpSections ? "plus" : undefined}
                  >
                    <Icon name="plus" size={13} />
                    {isPending ? "Setting up..." : "Set up"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </SidePanel>
    </div>
  );
}
