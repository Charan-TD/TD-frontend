"use client";

import { useEffect, useState } from "react";
import { useAssignRoleViewModel } from "../viewmodels/assignRoleViewModel";
import { can, type PermissionMap } from "../../admin/models/access";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { PermissionMatrixEditor } from "../components/PermissionMatrixEditor";
import type { PermissionMatrix } from "../models/employee";
import { describeActions, isLinkedResource, sectionDisplayName } from "../models/permissions";
import { SidePanel } from "../../admin/components/SidePanel";
import { ConfirmDialog } from "../../admin/components/ConfirmDialog";

export function AssignRoleView({
  onBack,
  permissions,
}: {
  onBack?: () => void;
  permissions: PermissionMap;
}) {
  const vm = useAssignRoleViewModel({ permissions });
  const canCreateRole = can(permissions, "roles", "insert");
  const canUpdateRole = can(permissions, "roles", "update");
  const canDeleteRole = can(permissions, "roles", "delete");
  const canAssignRole = can(permissions, "employee_roles", "insert");

  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRoleMatrix, setNewRoleMatrix] = useState<PermissionMatrix>({});
  const [showEditRole, setShowEditRole] = useState(false);
  const [editPermissionMatrix, setEditPermissionMatrix] = useState<PermissionMatrix>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setEditPermissionMatrix(vm.selectedRole?.matrix ?? {});
  }, [vm.selectedRole]);

  // Linked access follows its section, so it isn't listed separately.
  const visibleRoleAccess = Object.entries(vm.selectedRole?.matrix ?? {}).filter(
    ([resource, actions]) => !isLinkedResource(resource) && (actions ?? []).length > 0,
  );

  const createRoleBlocked = disabledReason(
    [vm.isCreatingRole, "Please wait, the role is being created"],
    [!newRoleName.trim(), "Enter a role name"],
    [
      Object.values(newRoleMatrix).every((actions) => !actions || actions.length === 0),
      "Give the role at least one permission",
    ],
  );

  const assignBlocked = disabledReason(
    [!canAssignRole, noAccess("assign roles to employees")],
    [vm.isSaving, "Please wait, the role is being assigned"],
    [!vm.employeeId, "Select an employee"],
    [!vm.roleName, "Select a role"],
  );

  return (
    <section className="employee-workspace">
      <div className="assign-role-heading">
        <div>
          <span className="eyebrow">ROLE ASSIGNMENT</span>

          <h2>Assign Role</h2>

          <p>
            Assign an existing role to an employee.
            Role permissions are read-only here.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => setShowCreateRole(true)}
          disabled={!canCreateRole}
          data-tooltip={canCreateRole ? undefined : noAccess("create roles")}
          data-tooltip-kind="access"
        >
          Create Role
        </button>
      </div>

      <div className="assign-role-form">
        <label>
          <span>Employee</span>

          <select
            value={vm.employeeId}
            onChange={(event) =>
              vm.onSelectEmployee(event.target.value)
            }
            disabled={vm.isSaving}
          >
            <option value="">Select employee</option>

            {vm.employees.map((employee) => (
              <option
                key={employee.id}
                value={employee.id}
              >
                {employee.name} ({employee.empId})
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Existing Role</span>

          <select
            value={vm.roleName}
            onChange={(event) =>
              vm.selectRole(event.target.value)
            }
            disabled={vm.isSaving}
          >
            <option value="">Select role</option>

            {vm.roles.map((role) => (
              <option
                key={role.id}
                value={role.name}
              >
                {role.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {vm.selectedRole && (
        <div className="permission-matrix-readout">
          <div className="assign-role-heading">
            <div>
              <h3>{vm.selectedRole.name}</h3>

              {vm.selectedRole.description && (
                <p>{vm.selectedRole.description}</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowEditRole(true)}
                disabled={!canUpdateRole || vm.isDeletingRole}
                data-tooltip={!canUpdateRole ? noAccess("change what this role can do") : vm.isDeletingRole ? "Please wait, this role is being deleted" : undefined}
                data-tooltip-kind={canUpdateRole ? undefined : "access"}
              >
                Configure permissions
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={!canDeleteRole || vm.isDeletingRole}
                data-tooltip={!canDeleteRole ? noAccess("delete roles") : vm.isDeletingRole ? "Please wait, this role is being deleted" : undefined}
                data-tooltip-kind={canDeleteRole ? undefined : "access"}
              >
                {vm.isDeletingRole ? "Deleting..." : "Delete role"}
              </button>
            </div>
          </div>

          <div className="permission-list">
            {visibleRoleAccess.length > 0 ? (
              visibleRoleAccess.map(([resource, actions]) => (
                <div className="permission-matrix-row" key={resource}>
                  <span>{sectionDisplayName(resource)}</span>
                  <small>{describeActions(actions)}</small>
                </div>
              ))
            ) : (
              <div className="api-state">No permissions configured for this role.</div>
            )}
          </div>
        </div>
      )}

      <SidePanel
        open={showCreateRole}
        onClose={() => setShowCreateRole(false)}
        eyebrow="ROLE MANAGEMENT"
        title="Create Role"
        description="Create a new role and select its permissions."
        widthVariant="wide"
      >
        <div className="assign-role-form">
          <label>
            <span>Role Name</span>

            <input
              type="text"
              value={newRoleName}
              onChange={(event) =>
                setNewRoleName(event.target.value)
              }
              placeholder="Enter role name"
              disabled={vm.isCreatingRole}
            />
          </label>

          <label>
            <span>Description</span>

            <input
              type="text"
              value={newRoleDescription}
              onChange={(event) =>
                setNewRoleDescription(event.target.value)
              }
              placeholder="Enter role description"
              disabled={vm.isCreatingRole}
            />
          </label>
        </div>

        <PermissionMatrixEditor
          value={newRoleMatrix}
          permissions={vm.permissions}
          onChange={setNewRoleMatrix}
          disabled={vm.isCreatingRole}
        />

        <div className="assign-role-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowCreateRole(false)}
            disabled={vm.isCreatingRole}
            data-tooltip={vm.isCreatingRole ? "Please wait, the role is being created" : undefined}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              const role = await vm.createRole(
                newRoleName,
                newRoleDescription,
                newRoleMatrix
              );

              if (role) {
                setNewRoleName("");
                setNewRoleDescription("");
                setNewRoleMatrix({});
                setShowCreateRole(false);
              }
            }}
            disabled={Boolean(createRoleBlocked)}
            data-tooltip={createRoleBlocked}
          >
            {vm.isCreatingRole
              ? "Creating..."
              : "Create Role"}
          </button>
        </div>
      </SidePanel>

      <SidePanel
        open={showEditRole && Boolean(vm.selectedRole)}
        onClose={() => setShowEditRole(false)}
        eyebrow="ROLE MANAGEMENT"
        title={`Configure ${vm.selectedRole?.name ?? "Role"}`}
        description="Update the permissions assigned to this role."
        widthVariant="wide"
      >
        {vm.selectedRole && (
          <>
            <PermissionMatrixEditor
              value={editPermissionMatrix}
              permissions={vm.permissions}
              onChange={setEditPermissionMatrix}
              disabled={vm.isUpdatingRole}
            />
            <div className="assign-role-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowEditRole(false)}
                disabled={vm.isUpdatingRole}
                data-tooltip={vm.isUpdatingRole ? "Please wait, your changes are being saved" : undefined}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  const role = await vm.updateRole(
                    vm.selectedRole!.id,
                    vm.selectedRole!.name,
                    vm.selectedRole!.description,
                    editPermissionMatrix,
                  );
                  if (role) setShowEditRole(false);
                }}
                disabled={vm.isUpdatingRole}
                data-tooltip={vm.isUpdatingRole ? "Please wait, your changes are being saved" : undefined}
              >
                {vm.isUpdatingRole ? "Saving..." : "Save permissions"}
              </button>
            </div>
          </>
        )}
      </SidePanel>

      <ConfirmDialog
        open={showDeleteConfirm && Boolean(vm.selectedRole)}
        tone="danger"
        title="Delete role?"
        message={
          <>
            You are about to delete <strong>{vm.selectedRole?.name}</strong>.
            <br />
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete role"
        busyLabel="Deleting..."
        busy={vm.isDeletingRole}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await vm.deleteRole(vm.selectedRole!.id);
          setShowDeleteConfirm(false);
        }}
      />

      {vm.errorMessage && (
        <div className="api-state">
          {vm.errorMessage}
        </div>
      )}

      {vm.savedMessage && (
        <div className="api-state">
          {vm.savedMessage}
        </div>
      )}

      <div className="assign-role-actions">
        {onBack && (
          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
            disabled={vm.isSaving}
            data-tooltip={vm.isSaving ? "Please wait, the role is being assigned" : undefined}
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          className="primary-button"
          onClick={vm.save}
          disabled={Boolean(assignBlocked)}
          data-tooltip={assignBlocked}
          data-tooltip-kind={canAssignRole ? undefined : "access"}
        >
          {vm.isSaving
            ? "Assigning..."
            : "Assign Role"}
        </button>
      </div>
    </section>
  );
}
