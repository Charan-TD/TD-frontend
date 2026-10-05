"use client";

import { useState } from "react";
import { Icon } from "../../admin/components/Icon";
import { SidePanel } from "../../admin/components/SidePanel";
import { ConfirmDialog } from "../../admin/components/ConfirmDialog";
import { can, type PermissionMap } from "../../admin/models/access";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { Skeleton } from "../../admin/components/Skeleton";
import type { EmployeeRoleSummary, PermissionMatrix } from "../models/employee";
import { PermissionMatrixEditor } from "../components/PermissionMatrixEditor";
import { RoleSearchSelect } from "../components/RoleSearchSelect";
import { useEmployeeDetailsViewModel } from "../viewmodels/employeeDetailsViewModel";

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
  const canUpdateRole = can(permissions, "roles", "update");
  const canRestoreRole = can(permissions, "employee_roles", "update");

  // Edit employee details
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Edit role
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleMatrix, setRoleMatrix] = useState<PermissionMatrix>({});
  const editingRole = vm.roles.find((role) => role.id === editingRoleId);

  // Add / remove role
  const [newRoleName, setNewRoleName] = useState("");
  const [roleToRemove, setRoleToRemove] = useState<EmployeeRoleSummary | null>(null);

  if (!employee && vm.isLoading) {
    return (
      <section className="employee-workspace employee-details" aria-busy="true">
        <button className="back-link" type="button" onClick={onBack}>
          <Icon name="arrow-left" size={15} /> Back to staff list
        </button>
        <header className="employee-profile-header">
          <div>
            <Skeleton width={56} height={56} style={{ borderRadius: "50%" }} />
            <div style={{ display: "grid", gap: 8, minWidth: 220 }}>
              <Skeleton width="40%" height={10} />
              <Skeleton width="80%" height={20} />
              <Skeleton width="60%" height={12} />
            </div>
          </div>
        </header>
        <div className="employee-detail-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <article key={index}>
              <Skeleton width="45%" height={10} />
              <Skeleton width="70%" height={16} style={{ marginTop: 8 }} />
            </article>
          ))}
        </div>
        <div className="employee-permissions">
          <Skeleton width={140} height={16} />
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <Skeleton height={36} />
            <Skeleton height={36} />
          </div>
        </div>
      </section>
    );
  }

  if (!employee) {
    return (
      <section className="employee-workspace">
        <p>Employee not found.</p>
        <button className="secondary-button" onClick={onBack}>
          Back
        </button>
      </section>
    );
  }

  const assignedRoleIds = new Set(employee.roleIds);
  // Removed roles can be restored from their own row, so they aren't offered here.
  const assignableRoles = vm.roles.filter((role) => !assignedRoleIds.has(role.id));
  const orderedRoles = [...employee.roles].sort(
    (a, b) => Number(a.status === "Inactive") - Number(b.status === "Inactive"),
  );
  const activeRoleCount = employee.roles.filter((role) => role.status === "Active").length;

  const saveDetailsBlocked = disabledReason(
    [vm.isUpdatingEmployee, "Please wait, changes are being saved"],
    [!name.trim(), "Enter the employee's name"],
    [!email.trim(), "Enter the employee's email"],
    [name.trim() === employee.name && email.trim() === employee.email, "Nothing has changed yet"],
  );

  const openEditDetails = () => {
    setName(employee.name);
    setEmail(employee.email);
    setShowEditDetails(true);
  };

  const openEditRole = (roleId: string) => {
    const role = vm.roles.find((item) => item.id === roleId);
    if (!role) return;
    setRoleName(role.name);
    setRoleDescription(role.description);
    setRoleMatrix(role.matrix);
    setEditingRoleId(role.id);
  };

  return (
    <section className="employee-workspace employee-details">
      <button className="back-link" type="button" onClick={onBack}>
        <Icon name="arrow-left" size={15} /> Back to staff list
      </button>
      <header className="employee-profile-header">
        <div>
          <span className="employee-avatar employee-avatar--large">
            {employee.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <span className="eyebrow">ACCOUNT OVERVIEW</span>
            <h2>{employee.name}</h2>
            <p>{employee.email}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="primary-button"
            type="button"
            onClick={openEditDetails}
            disabled={!canUpdateEmployee}
            data-tooltip={canUpdateEmployee ? undefined : noAccess("edit employee details")}
            data-tooltip-kind="access"
          >
            Edit details
          </button>
          <button className="secondary-button" type="button" onClick={onAssignRole}>
            Roles &amp; access
          </button>
        </div>
      </header>

      {vm.savedMessage && <div className="success-banner">{vm.savedMessage}</div>}
      {vm.errorMessage && <div className="api-state api-state--error">{vm.errorMessage}</div>}

      <div className="employee-detail-grid">
        <article>
          <span>{activeRoleCount > 1 ? "Roles" : "Role"}</span>
          <strong>{employee.role}</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>{employee.status}</strong>
        </article>
        <article>
          <span>Employee ID</span>
          <strong>{employee.empId}</strong>
        </article>
        <article>
          <span>Joined</span>
          <strong>{employee.createdAt}</strong>
        </article>
      </div>

      {/* ================================
          ASSIGNED ROLES
      ================================= */}
      <div className="employee-permissions">
        <h3>Assigned roles</h3>
        <div className="permission-matrix-readout">
          {orderedRoles.map((role) => role.status === "Inactive" ? (
            <div className="permission-matrix-row is-removed" key={role.assignmentId}>
              <div>
                <strong>{role.name}</strong>
                <span className="role-removed-pill">Removed</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className="table-action"
                  type="button"
                  onClick={() => vm.restoreRole(role.assignmentId)}
                  disabled={!canRestoreRole || vm.isRestoringRole}
                  data-tooltip={!canRestoreRole ? noAccess("give removed roles back") : vm.isRestoringRole ? "Please wait, the role is being restored" : "Give this role back to the employee"}
                  data-tooltip-kind={canRestoreRole ? undefined : "access"}
                  data-tooltip-icon={canRestoreRole ? "check" : undefined}
                >
                  {vm.isRestoringRole ? "Restoring..." : "Restore"}
                </button>
              </div>
            </div>
          ) : (
            <div className="permission-matrix-row" key={role.assignmentId}>
              <div>
                <strong>{role.name}</strong>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className="table-action"
                  type="button"
                  onClick={() => openEditRole(role.id)}
                  disabled={!canUpdateRole}
                  data-tooltip={canUpdateRole ? undefined : noAccess("edit roles")}
                  data-tooltip-kind="access"
                >
                  Edit role
                </button>
                <button
                  className="table-action table-action--danger"
                  type="button"
                  onClick={() => setRoleToRemove(role)}
                  disabled={!canRemoveRole || vm.isRemovingRole}
                  data-tooltip={!canRemoveRole ? noAccess("remove roles from employees") : vm.isRemovingRole ? "Please wait, a role is being removed" : undefined}
                  data-tooltip-kind={canRemoveRole ? undefined : "access"}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {activeRoleCount === 0 && <div className="api-state">No active roles. Add one below{orderedRoles.length ? " or restore a removed one" : ""}.</div>}
        </div>

        {assignableRoles.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 12 }}>
            <label style={{ flex: 1 }}>
              <span>Add another role</span>
              <RoleSearchSelect
                roles={assignableRoles}
                value={newRoleName}
                onChange={setNewRoleName}
                disabled={!canAssignRole || vm.isAssigningRole}
                disabledHint={canAssignRole ? undefined : noAccess("add roles to employees")}
                disabledHintKind={canAssignRole ? undefined : "access"}
                placeholder="Select role"
              />
            </label>
            <button
              className="secondary-button"
              type="button"
              disabled={!canAssignRole || !newRoleName || vm.isAssigningRole}
              data-tooltip={!canAssignRole ? noAccess("add roles to employees") : vm.isAssigningRole ? "Please wait, the role is being added" : !newRoleName ? "Select a role to add first" : undefined}
              data-tooltip-kind={canAssignRole ? undefined : "access"}
              onClick={async () => {
                const role = assignableRoles.find((item) => item.name === newRoleName);
                if (role && (await vm.addRole(role.id))) setNewRoleName("");
              }}
            >
              {vm.isAssigningRole ? "Adding..." : "Add role"}
            </button>
          </div>
        )}
      </div>

      {/* ================================
          EDIT DETAILS PANEL
      ================================= */}
      <SidePanel
        open={showEditDetails}
        onClose={() => setShowEditDetails(false)}
        eyebrow="EMPLOYEE"
        title="Edit details"
        description={`Update ${employee.name}'s name and email.`}
        closeDisabled={vm.isUpdatingEmployee}
      >
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} disabled={vm.isUpdatingEmployee} />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={vm.isUpdatingEmployee}
            />
          </label>
        </div>
        <div className="assign-role-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setShowEditDetails(false)}
            disabled={vm.isUpdatingEmployee}
            data-tooltip={vm.isUpdatingEmployee ? "Please wait, changes are being saved" : undefined}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={Boolean(saveDetailsBlocked)}
            data-tooltip={saveDetailsBlocked}
            onClick={async () => {
              if (await vm.updateDetails(name, email)) setShowEditDetails(false);
            }}
          >
            {vm.isUpdatingEmployee ? "Saving..." : "Save changes"}
          </button>
        </div>
      </SidePanel>

      {/* ================================
          EDIT ROLE PANEL
      ================================= */}
      <SidePanel
        open={Boolean(editingRole)}
        onClose={() => setEditingRoleId(null)}
        eyebrow="ROLE MANAGEMENT"
        title={`Edit ${editingRole?.name ?? "role"}`}
        description="Changes apply to every employee who has this role."
        widthVariant="wide"
        closeDisabled={vm.isUpdatingRole}
      >
        <div className="form-grid">
          <label>
            <span>Role name</span>
            <input value={roleName} onChange={(event) => setRoleName(event.target.value)} disabled={vm.isUpdatingRole} />
          </label>
          <label>
            <span>Description</span>
            <input
              value={roleDescription}
              onChange={(event) => setRoleDescription(event.target.value)}
              disabled={vm.isUpdatingRole}
            />
          </label>
        </div>
        <PermissionMatrixEditor
          value={roleMatrix}
          permissions={vm.permissions}
          onChange={setRoleMatrix}
          disabled={vm.isUpdatingRole}
        />
        <div className="assign-role-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => setEditingRoleId(null)}
            disabled={vm.isUpdatingRole}
            data-tooltip={vm.isUpdatingRole ? "Please wait, the role is being saved" : undefined}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={vm.isUpdatingRole || !roleName.trim()}
            data-tooltip={vm.isUpdatingRole ? "Please wait, the role is being saved" : !roleName.trim() ? "Enter a role name" : undefined}
            onClick={async () => {
              if (editingRole && (await vm.updateRole(editingRole.id, roleName, roleDescription, roleMatrix))) {
                setEditingRoleId(null);
              }
            }}
          >
            {vm.isUpdatingRole ? "Saving..." : "Save role"}
          </button>
        </div>
      </SidePanel>

      <ConfirmDialog
        open={Boolean(roleToRemove)}
        tone="danger"
        title="Remove role?"
        message={
          <>
            <strong>{roleToRemove?.name}</strong> will be removed from <strong>{employee.name}</strong>.
            <br />
            The role itself is not deleted.
          </>
        }
        confirmLabel="Remove role"
        busyLabel="Removing..."
        busy={vm.isRemovingRole}
        onCancel={() => setRoleToRemove(null)}
        onConfirm={async () => {
          if (roleToRemove) await vm.removeRole(roleToRemove.assignmentId);
          setRoleToRemove(null);
        }}
      />
    </section>
  );
}
