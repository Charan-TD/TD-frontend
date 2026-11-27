"use client";

import { useMemo, useState } from "react";

import { Icon } from "../../admin/components/Icon";
import { noAccess } from "../../admin/models/disabledReason";
import { useCreatePermissionMutation } from "../api/rolesApi";
import { getErrorMessage } from "../viewmodels/assignRoleViewModel";
import {
  PORTAL_SECTIONS,
  type DbPermission,
  type PermissionMatrix,
} from "../models/employee";
import {
  countPermissions,
  countSections,
  hasEdit,
  hasView,
  isLinkedResource,
  isPausedSection,
  sectionDisplayName,
  setSectionEdit,
  setSectionView,
} from "../models/permissions";

type Props = {
  value: PermissionMatrix;
  permissions: DbPermission[];
  onChange: (matrix: PermissionMatrix) => void;
  /** Read-only: the boxes show access but cannot be changed. */
  disabled?: boolean;
  /**
   * Whether the signed-in person may add permission rows. Sections the app
   * knows about but the database doesn't have yet (e.g. Feedback) can then be
   * set up straight from the table.
   */
  canSetUpSections?: boolean;
  title?: string;
  description?: string;
  /** Keeps the table short and scrollable, for use inside a side panel. */
  compact?: boolean;
};

type Row = { resource: string; label: string; icon: (typeof PORTAL_SECTIONS)[number]["icon"] | "settings"; inDatabase: boolean };

/**
 * Access table: one row per section with a View and an Edit box.
 * Edit means add, update and delete together, and always includes View.
 */
export function PermissionMatrixEditor({
  value,
  permissions,
  onChange,
  disabled = false,
  canSetUpSections = false,
  title = "Access",
  description = "Tick what everyone with this role can see and change.",
  compact = false,
}: Props) {
  const [createPermission] = useCreatePermissionMutation();
  const [settingUp, setSettingUp] = useState<string | null>(null);
  const [setUpError, setSetUpError] = useState("");

  const rows = useMemo<Row[]>(() => {
    const inDatabase = new Set(permissions.map((permission) => permission.permission_name.trim().toLowerCase()));
    const known = PORTAL_SECTIONS.filter((section) => !isPausedSection(section.id)).map<Row>((section) => ({
      resource: section.id, label: section.label, icon: section.icon, inDatabase: inDatabase.has(section.id),
    }));
    const knownIds = new Set<string>(PORTAL_SECTIONS.map((section) => section.id));
    // Anything else in the database (custom sections) is still listed, after the known ones.
    const extra = [...inDatabase]
      .filter((resource) => resource && !knownIds.has(resource) && !isLinkedResource(resource) && !isPausedSection(resource))
      .sort()
      .map<Row>((resource) => ({ resource, label: sectionDisplayName(resource), icon: "settings", inDatabase: true }));
    return [...known, ...extra];
  }, [permissions]);

  const setUpSection = async (resource: string) => {
    setSetUpError("");
    setSettingUp(resource);
    try {
      // The row turns into normal checkboxes once permissions reload.
      await createPermission({ permissionName: resource }).unwrap();
    } catch (error) {
      setSetUpError(getErrorMessage(error));
    } finally {
      setSettingUp(null);
    }
  };

  const sections = countSections(value);
  const total = countPermissions(value);

  return (
    <div className={`td-access${compact ? " td-access--compact" : ""}`}>
      <header className="td-access-head">
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
        <span className="td-count-chip">{sections} {sections === 1 ? "section" : "sections"} · {total} {total === 1 ? "permission" : "permissions"}</span>
      </header>

      {setUpError && <div className="api-state api-state--error">{setUpError}</div>}

      <div className="td-access-scroll">
        <table className="td-access-table">
          <thead>
            <tr><th>Section</th><th>View</th><th>Edit</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const actions = value[row.resource];
              return (
                <tr key={row.resource}>
                  <td><span className="td-access-name"><Icon name={row.icon} size={15} />{row.label}</span></td>
                  {row.inDatabase || hasView(actions) || hasEdit(actions) ? (
                    <>
                      <td>
                        <input
                          type="checkbox"
                          className="td-box"
                          aria-label={`${row.label}: view`}
                          checked={hasView(actions)}
                          disabled={disabled}
                          onChange={(event) => onChange(setSectionView(value, row.resource, event.target.checked))}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className="td-box"
                          aria-label={`${row.label}: edit (add, update and delete)`}
                          title="Edit lets them add, update and delete"
                          checked={hasEdit(actions)}
                          disabled={disabled}
                          onChange={(event) => onChange(setSectionEdit(value, row.resource, event.target.checked))}
                        />
                      </td>
                    </>
                  ) : (
                    <td colSpan={2} className="td-access-setup">
                      {disabled ? <small>Not set up yet</small> : (
                        <button
                          type="button"
                          className="td-setup-btn"
                          onClick={() => setUpSection(row.resource)}
                          disabled={!canSetUpSections || settingUp !== null}
                          data-tooltip={
                            !canSetUpSections
                              ? noAccess("set up new sections")
                              : settingUp !== null
                                ? "Please wait, a section is being set up"
                                : `Make ${row.label} available to give to roles`
                          }
                          data-tooltip-kind={canSetUpSections ? undefined : "access"}
                        >
                          <Icon name="plus" size={12} />{settingUp === row.resource ? "Setting up…" : "Set up"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
