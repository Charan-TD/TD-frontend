"use client";

import { useEffect, useState } from "react";
import { useAssignRoleViewModel } from "../viewmodels/assignRoleViewModel";
import { can, type PermissionMap } from "../../admin/models/access";
import { PermissionMatrixEditor } from "../components/PermissionMatrixEditor";
import { SidePanel } from "../../admin/components/SidePanel";

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
  const canCreatePermission = can(permissions, "permissions", "insert");

  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRolePermissionIds, setNewRolePermissionIds] = useState<string[]>([]);
  const [showEditRole, setShowEditRole] = useState(false);
  const [editPermissionIds, setEditPermissionIds] = useState<string[]>([]);

  useEffect(() => {
    setEditPermissionIds(vm.selectedRole?.permissionIds ?? []);
  }, [vm.selectedRole]);

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

        {canCreateRole && (
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowCreateRole(true)}
          >
            Create Role
          </button>
        )}
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
            {canUpdateRole && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowEditRole(true)}
              >
                Configure permissions
              </button>
            )}
          </div>

          <div className="permission-list">
            {vm.selectedRole.permissions &&
              vm.selectedRole.permissions.length > 0 ? (
              vm.selectedRole.permissions.map((permission) => (
                <div
                  className="permission-matrix-row"
                  key={permission.id}
                >
                  <span>
                    {permission.permission_name}
                  </span>
                </div>
              ))
            ) : (
              <div className="api-state">
                No permissions configured for this role.
              </div>
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
          value={newRolePermissionIds}
          permissions={vm.permissions}
          onChange={setNewRolePermissionIds}
          disabled={vm.isCreatingRole}
        />

        <div className="assign-role-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setShowCreateRole(false)}
            disabled={vm.isCreatingRole}
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
                newRolePermissionIds,
                {}
              );

              if (role) {
                setNewRoleName("");
                setNewRoleDescription("");
                setNewRolePermissionIds([]);
                setShowCreateRole(false);
              }
            }}
            disabled={
              vm.isCreatingRole ||
              !newRoleName.trim() ||
              newRolePermissionIds.length === 0
            }
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
              value={editPermissionIds}
              permissions={vm.permissions}
              onChange={setEditPermissionIds}
              disabled={vm.isUpdatingRole}
            />
            <div className="assign-role-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowEditRole(false)}
                disabled={vm.isUpdatingRole}
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
                    editPermissionIds,
                  );
                  if (role) setShowEditRole(false);
                }}
                disabled={vm.isUpdatingRole}
              >
                {vm.isUpdatingRole ? "Saving..." : "Save permissions"}
              </button>
            </div>
          </>
        )}
      </SidePanel>

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
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          className="primary-button"
          onClick={vm.save}
          disabled={
            vm.isSaving ||
            !vm.employeeId ||
            !vm.roleName
          }
        >
          {vm.isSaving
            ? "Assigning..."
            : "Assign Role"}
        </button>
      </div>
    </section>
  );
}
