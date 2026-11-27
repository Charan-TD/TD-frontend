"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../admin/components/Icon";
import { RequiredFieldMark } from "../../admin/components/RequiredFieldMark";
import { InitialsAvatar } from "../../admin/components/InitialsAvatar";
import { SidePanel } from "../../admin/components/SidePanel";
import { StatusSwitch } from "../../admin/components/StatusSwitch";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { can, type PermissionMap } from "../../admin/models/access";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { Skeleton } from "../../admin/components/Skeleton";
import type { EmployeeStatus } from "../models/employee";
import { useEmployeeDetailsViewModel } from "../viewmodels/employeeDetailsViewModel";

/**
 * An employee's account, as a panel over the staff list: sign-in status,
 * password reset and roles. Changes are staged and applied with "Save changes".
 */
export function EmployeeDetailsView({
  employeeId,
  onBack,
  onAssignRole,
  permissions = {},
}: {
  employeeId: string;
  onBack: () => void;
  onAssignRole: () => void;
  permissions?: PermissionMap;
}) {
  const vm = useEmployeeDetailsViewModel(employeeId, permissions);
  const employee = vm.employee;

  const canUpdateEmployee = can(permissions, "employees", "update");
  const canAssignRole = can(permissions, "employee_roles", "insert");
  const canRemoveRole = can(permissions, "employee_roles", "delete");

  const [status, setStatus] = useState<EmployeeStatus | null>(null);
  const [addedRoleIds, setAddedRoleIds] = useState<string[]>([]);
  const [removedAssignmentIds, setRemovedAssignmentIds] = useState<string[]>([]);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);

  const [showEditDetails, setShowEditDetails] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!roleMenuOpen) return;
    const onDown = (event: MouseEvent) => { if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) setRoleMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [roleMenuOpen]);

  const createdAt = employee?.createdAt;
  const joinedDate = createdAt ? new Date(createdAt) : null;
  const joined = !createdAt ? "" : joinedDate && !Number.isNaN(joinedDate.getTime()) ? joinedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : createdAt;

  if (!employee) {
    return (
      <SidePanel open onClose={onBack} title={vm.isLoading ? "Loading…" : "Employee not found"} description={vm.isLoading ? undefined : "This employee may have been removed."}>
        {vm.isLoading ? <div style={{ display: "grid", gap: 12 }}><Skeleton height={64} /><Skeleton height={64} /><Skeleton height={90} /></div> : null}
      </SidePanel>
    );
  }

  const currentStatus = status ?? employee.status;
  const statusChanged = currentStatus !== employee.status;

  const activeRoles = employee.roles.filter((role) => role.status === "Active" && !removedAssignmentIds.includes(role.assignmentId));
  const addedRoles = vm.roles.filter((role) => addedRoleIds.includes(role.id));
  const shownRoleIds = new Set([...activeRoles.map((role) => role.id), ...addedRoleIds]);
  // Roles they once had are offered again here; adding one switches it back on.
  const assignableRoles = vm.roles.filter((role) => !shownRoleIds.has(role.id));

  const hasChanges = statusChanged || addedRoleIds.length > 0 || removedAssignmentIds.length > 0;
  const saveBlocked = disabledReason(
    [vm.isUpdatingStatus || vm.isAssigningRole || vm.isRemovingRole, "Please wait, changes are being saved"],
    [!hasChanges, "Nothing has changed yet"],
  );

  const removeRole = (role: { id: string; assignmentId: string }) => {
    // A role that was only just staged is simply unstaged.
    if (addedRoleIds.includes(role.id)) setAddedRoleIds((ids) => ids.filter((id) => id !== role.id));
    else setRemovedAssignmentIds((ids) => [...ids, role.assignmentId]);
  };

  const addRole = (roleId: string) => {
    setRoleMenuOpen(false);
    const previous = employee.roles.find((role) => role.id === roleId && role.status === "Active" && removedAssignmentIds.includes(role.assignmentId));
    // Putting back a role that was just crossed out cancels the removal.
    if (previous) setRemovedAssignmentIds((ids) => ids.filter((id) => id !== previous.assignmentId));
    else setAddedRoleIds((ids) => [...ids, roleId]);
  };

  const save = async () => {
    const ok = await vm.saveChanges({ status: statusChanged ? currentStatus : undefined, addRoleIds: addedRoleIds, removeAssignmentIds: removedAssignmentIds });
    if (ok) {
      setStatus(null);
      setAddedRoleIds([]);
      setRemovedAssignmentIds([]);
    }
  };

  const saveDetailsBlocked = disabledReason(
    [vm.isUpdatingEmployee, "Please wait, changes are being saved"],
    [!name.trim(), "Enter the employee's name"],
    [!email.trim(), "Enter the employee's email"],
    [name.trim() === employee.name && email.trim() === employee.email, "Nothing has changed yet"],
  );

  const busy = vm.isUpdatingStatus || vm.isAssigningRole || vm.isRemovingRole;

  return (
    <>
      <SidePanel
        open
        onClose={onBack}
        title={employee.name}
        closeDisabled={busy}
        header={(
          <div className="td-person">
            <InitialsAvatar name={employee.name} imageUrl={employee.profileImgUrl} size={52} />
            <div>
              <h3>{employee.name}</h3>
              <p>{employee.email}</p>
              <small>
                {employee.empId}{joined ? ` · Joined ${joined}` : ""}
                {canUpdateEmployee && <button type="button" className="td-inline-link" onClick={() => { setName(employee.name); setEmail(employee.email); setShowEditDetails(true); }}>Edit details</button>}
              </small>
            </div>
          </div>
        )}
        footer={(
          <>
            <button type="button" className="td-btn" onClick={onBack} disabled={busy}>Cancel</button>
            <button type="button" className="td-btn td-btn--primary" onClick={save} disabled={Boolean(saveBlocked)} data-tooltip={saveBlocked}>
              <Icon name="check" size={14} stroke={2.4} />{busy ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      >
        <TransientSuccessMessage message={vm.savedMessage} />
        {vm.errorMessage && <div className="api-state api-state--error">{vm.errorMessage}</div>}

        <div className="td-setting">
          <div><strong>Status</strong><small>When off, this employee can&apos;t sign in</small></div>
          <StatusSwitch
            checked={currentStatus === "Active"}
            label={`Sign-in status of ${employee.name}`}
            disabled={!canUpdateEmployee || busy}
            tooltip={!canUpdateEmployee ? noAccess("activate or deactivate employees") : undefined}
            tooltipKind={canUpdateEmployee ? undefined : "access"}
            onChange={(on) => setStatus(on ? "Active" : "Inactive")}
          />
        </div>

        <div className="td-setting">
          <div><strong>Password</strong><small>Send a link so they can set a new one</small></div>
          <button type="button" className="td-btn td-btn--small" onClick={vm.sendResetLink} disabled={!canUpdateEmployee || vm.isSendingReset}
            data-tooltip={!canUpdateEmployee ? noAccess("reset passwords") : undefined} data-tooltip-kind={canUpdateEmployee ? undefined : "access"}>
            {vm.isSendingReset ? "Sending…" : "Send reset link"}
          </button>
        </div>

        <div className="td-divider" />

        <div className="td-section-head">
          <h4>Roles</h4>
          <button type="button" className="td-inline-link td-inline-link--dark" onClick={onAssignRole}>Manage roles</button>
        </div>
        <p className="td-hint">An employee can have more than one role. They get the access of every role added.</p>

        <div className="td-chip-row">
          {[...activeRoles, ...addedRoles.map((role) => ({ id: role.id, name: role.name, assignmentId: "" }))].map((role) => (
            <span className="td-role-tag" key={`${role.id}-${role.assignmentId}`}>
              {role.name}
              <button type="button" aria-label={`Remove ${role.name}`} disabled={!canRemoveRole || busy}
                data-tooltip={!canRemoveRole ? noAccess("remove roles from employees") : undefined} data-tooltip-kind={canRemoveRole ? undefined : "access"}
                onClick={() => removeRole(role)}><Icon name="close" size={10} stroke={2.6} /></button>
            </span>
          ))}
          <div className="td-addrole" ref={roleMenuRef}>
            <button type="button" className="td-role-tag td-role-tag--add" disabled={!canAssignRole || busy || assignableRoles.length === 0}
              aria-haspopup="listbox" aria-expanded={roleMenuOpen}
              data-tooltip={!canAssignRole ? noAccess("add roles to employees") : assignableRoles.length === 0 ? "No other roles to add" : undefined} data-tooltip-kind={canAssignRole ? undefined : "access"}
              onClick={() => setRoleMenuOpen((open) => !open)}>
              + Add role <Icon name="chevron-down" size={12} />
            </button>
            {roleMenuOpen && (
              <ul className="td-menu td-menu--list" role="listbox">
                {assignableRoles.map((role) => <li key={role.id}><button type="button" role="option" aria-selected="false" onClick={() => addRole(role.id)}>{role.name}</button></li>)}
              </ul>
            )}
          </div>
        </div>
        {activeRoles.length === 0 && addedRoles.length === 0 && <p className="td-hint">No active roles yet.</p>}
      </SidePanel>

      <SidePanel
        open={showEditDetails}
        onClose={() => setShowEditDetails(false)}
        elevated
        title="Edit details"
        description={`Update ${employee.name}'s name and email.`}
        closeDisabled={vm.isUpdatingEmployee}
        footer={(
          <>
            <button type="button" className="td-btn" onClick={() => setShowEditDetails(false)} disabled={vm.isUpdatingEmployee}>Cancel</button>
            <button type="button" className="td-btn td-btn--primary" disabled={Boolean(saveDetailsBlocked)} data-tooltip={saveDetailsBlocked}
              onClick={async () => { if (await vm.updateDetails(name, email)) setShowEditDetails(false); }}>
              {vm.isUpdatingEmployee ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      >
        <div className="td-form">
          <label><span>Name<RequiredFieldMark /></span><input value={name} onChange={(event) => setName(event.target.value)} disabled={vm.isUpdatingEmployee} required /></label>
          <label><span>Email<RequiredFieldMark /></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={vm.isUpdatingEmployee} required /></label>
        </div>
      </SidePanel>
    </>
  );
}
