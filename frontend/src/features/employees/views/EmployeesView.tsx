"use client";

import { useEffect, useState } from "react";
import { can, type PermissionMap } from "../../admin/models/access";

import {
  useEmployeesViewModel,
} from "../viewmodels/employeesViewModel";

import {
  PermissionMatrixEditor,
} from "../components/PermissionMatrixEditor";

import {
  RoleSearchSelect,
} from "../components/RoleSearchSelect";

import {
  SidePanel,
} from "../../admin/components/SidePanel";


export function EmployeesView({
  onManageRoles,
  permissions,
  autoOpenCreate = false,
  onAutoOpenHandled,
}: {
  onManageRoles?: () => void;
  permissions: PermissionMap;
  /** Opens the "Add employee" panel automatically (e.g. from the topbar quick action). */
  autoOpenCreate?: boolean;
  onAutoOpenHandled?: () => void;
  /** Accepted for compatibility with the caller; not used by this view. */
  onOpenDetails?: (employeeId: string) => void;
}) {
  const vm = useEmployeesViewModel();
  const canAddEmployee = can(permissions, "employees", "insert");
  const canCreateRole = can(permissions, "roles", "insert");
  const canCreatePermission = can(permissions, "permissions", "insert");

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);

  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    name,
    setName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    roleMode,
    setRoleMode,
  ] = useState<
    "existing" | "new"
  >("existing");

  const [
    role,
    setRole,
  ] = useState("");

  const [
    roleDescription,
    setRoleDescription,
  ] = useState("");

  const [
    permissionIds,
    setPermissionIds,
  ] = useState<string[]>([]);

  const resetForm = () => {
    setEmployeeId("");
    setName("");
    setEmail("");
    setPassword("");
    setRoleMode("existing");
    setRole("");
    setRoleDescription("");
    setPermissionIds([]);
  };

  const submit = async () => {
    if (
      !employeeId.trim() ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8 ||
      !role.trim()
    ) {
      return;
    }

    if (
      roleMode === "new" &&
      permissionIds.length === 0
    ) {
      return;
    }

    const result =
      await vm.createEmployee({
        empId: employeeId,
        name,
        email,
        password,
        roleMode,
        roleName: role,
        roleDescription,
        permissionIds,
      });

    if (result.success) {
      resetForm();
      setShowCreate(false);
    }
  };

  // Opens the panel when the admin uses the "Add employee" quick
  // action from the topbar, then clears the one-shot flag.
  useEffect(() => {
    if (!autoOpenCreate || !canAddEmployee) return;

    resetForm();
    setEmployeeId(vm.suggestedEmployeeId);
    setShowCreate(true);
    onAutoOpenHandled?.();
  }, [autoOpenCreate, canAddEmployee]);

  const selectedRole = vm.roles.find(
    (item) => item.name === role
  );

  const isCreating =
    vm.isCreating ||
    vm.isCreatingRole;

  return (
    <section className="employee-workspace">
      {/* ================================
          HEADER
      ================================= */}

      <header className="employee-header">
        <div>
          <h2>Team Members</h2>

          <p>
            Create employee accounts and
            assign their administrative role.
          </p>
        </div>

        <div className="employee-header-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={vm.refresh}
            disabled={vm.isFetching}
          >
            {vm.isFetching
              ? "Refreshing…"
              : "Refresh"}
          </button>

          {onManageRoles && (
            <button
              className="secondary-button"
              type="button"
              onClick={onManageRoles}
              disabled={!canCreateRole && !can(permissions, "roles", "read")}
            >
              Roles &amp; access
            </button>
          )}

          {canAddEmployee && <button
            className="primary-button"
            type="button"
            onClick={() => {
              resetForm();
              setEmployeeId(vm.suggestedEmployeeId);
              setShowCreate(true);
            }}
          >
            Add employee
          </button>}
        </div>
      </header>

      {/* ================================
          SUCCESS / ERROR
      ================================= */}

      {vm.savedMessage && (
        <div className="success-banner">
          {vm.savedMessage}
        </div>
      )}

      {vm.errorMessage && (
        <div className="api-state api-state--error">
          {vm.errorMessage}
        </div>
      )}

      {/* ================================
          SEARCH
      ================================= */}

      <div className="employee-toolbar">
        <div className="employee-search">
          <input
            value={vm.query}
            onChange={(event) =>
              vm.setQuery(event.target.value)
            }
            placeholder="Search staff members…"
            aria-label="Search staff members"
          />
        </div>

        <span>
          {vm.isFetching
            ? "Syncing…"
            : `${vm.totalEmployees} records`}
        </span>
      </div>

      {/* ================================
          LOADING
      ================================= */}

      {vm.isLoading && (
        <div className="api-state">
          Loading directory…
        </div>
      )}

      {/* ================================
          ERROR
      ================================= */}

      {vm.isError && !vm.isLoading && (
        <div className="api-state api-state--error">
          Unable to load staff records.
        </div>
      )}

      {/* ================================
          EMPLOYEE TABLE
      ================================= */}

      {!vm.isLoading &&
        !vm.isError && (
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Employee Id</th>
                  <th>Mail</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {vm.employees.map(
                  (employee) => (
                    <tr
                      key={employee.id}
                    >
                      <td>
                        <strong>
                          {employee.name}
                        </strong>
                      </td>

                      <td>
                        {employee.empId}
                      </td>

                      <td>
                        {employee.email}
                      </td>

                      <td>
                        {employee.role}
                      </td>

                      <td>
                        <span className="role-pill">
                          {employee.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="table-action"
                          type="button"
                          onClick={() =>
                            vm.updateStatus(
                              employee.id,
                              employee.status ===
                                "Active"
                                ? "Inactive"
                                : "Active"
                            )
                          }
                          disabled={
                            vm.isUpdatingStatus
                          }
                        >
                          {employee.status ===
                            "Active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {!vm.employees.length && (
              <div className="api-state">
                No employees found.
              </div>
            )}
          </div>
        )}

      {/* ================================
          PAGINATION
      ================================= */}

      {!vm.isLoading &&
        !vm.isError &&
        vm.totalEmployees > 0 && (
          <div className="employee-pagination">
            <span>
              Showing{" "}
              {(vm.page - 1) *
                vm.pageSize +
                1}
              –
              {Math.min(
                vm.page *
                vm.pageSize,
                vm.totalEmployees
              )}{" "}
              of{" "}
              {vm.totalEmployees}
            </span>

            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  vm.setPage(
                    vm.page - 1
                  )
                }
                disabled={
                  vm.page === 1 ||
                  vm.isFetching
                }
              >
                Previous
              </button>

              <span>
                Page {vm.page} of{" "}
                {vm.totalPages}
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  vm.setPage(
                    vm.page + 1
                  )
                }
                disabled={
                  vm.page ===
                  vm.totalPages ||
                  vm.isFetching
                }
              >
                Next
              </button>
            </div>
          </div>
        )}

      {/* ================================
          CREATE EMPLOYEE MODAL
      ================================= */}

      <SidePanel
        open={showCreate}
        onClose={() => {
          resetForm();
          setShowCreate(false);
        }}
        eyebrow="EMPLOYEE"
        title="Add employee"
        description="Create an account and assign a role."
        closeDisabled={isCreating}
      >
        {/* ============================
                EMPLOYEE DETAILS
            ============================= */}

        <div className="form-grid">
          <label>
            <span>Employee ID</span>

            <input
              value={employeeId}
              onChange={(event) =>
                setEmployeeId(
                  event.target.value
                )
              }
              placeholder="Enter employee ID"
              disabled={isCreating}
              required
            />

            <small>
              Suggested Employee ID:{" "}
              <strong>
                {vm.suggestedEmployeeId}
              </strong>
            </small>
          </label>

          <label>
            <span>Name</span>

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              disabled={isCreating}
            />
          </label>

          <label>
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              disabled={isCreating}
            />
          </label>

          <label>
            <span>Password</span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              minLength={8}
              disabled={isCreating}
            />
          </label>
        </div>

        {/* ============================
                ROLE MODE
            ============================= */}

        <div className="role-mode">
          <span>
            Role assignment
          </span>

          <label>
            <input
              type="radio"
              name="role-mode"
              checked={
                roleMode ===
                "existing"
              }
              onChange={() => {
                setRoleMode(
                  "existing"
                );
                setRole("");
                setRoleDescription("");
                setPermissionIds([]);
              }}
              disabled={isCreating}
            />

            Assign existing role
          </label>

          <label>
            <input
              type="radio"
              name="role-mode"
              checked={
                roleMode === "new"
              }
              onChange={() => {
                setRoleMode("new");
                setRole("");
                setRoleDescription("");
                setPermissionIds([]);
              }}
              disabled={isCreating}
            />

            Create new role
          </label>
        </div>

        {/* ============================
                EXISTING ROLE
            ============================= */}

        {roleMode ===
          "existing" && (
            <>
              <label>
                <span>
                  Existing role
                </span>

                <RoleSearchSelect
                  roles={vm.roles}
                  value={role}
                  onChange={setRole}
                  disabled={isCreating}
                  placeholder="Select role"
                />
              </label>

              {selectedRole && (
                <div className="permission-matrix-readout">
                  <p>
                    Permissions for this
                    role are already
                    configured and cannot
                    be changed here.
                  </p>

                  <PermissionMatrixEditor
                    value={
                      selectedRole.permissionIds
                    }
                    permissions={
                      vm.permissions
                    }
                    onChange={() =>
                      undefined
                    }
                    disabled
                  />
                </div>
              )}
            </>
          )}

        {/* ============================
                NEW ROLE
            ============================= */}

        {roleMode === "new" && (
          <>
            <div className="form-grid">
              <label>
                <span>
                  New role name
                </span>

                <input
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value
                    )
                  }
                  disabled={isCreating}
                />
              </label>

              <label>
                <span>
                  Description
                </span>

                <input
                  value={
                    roleDescription
                  }
                  onChange={(event) =>
                    setRoleDescription(
                      event.target.value
                    )
                  }
                  disabled={isCreating}
                />
              </label>
            </div>

            <div className="permission-matrix-editor">
              <p>
                Configure permissions
                for this new role.
              </p>

              <PermissionMatrixEditor
                value={permissionIds}
                permissions={vm.permissions}
                onChange={setPermissionIds}
                disabled={isCreating}
                onCreatePermission={canCreatePermission ? vm.createPermission : undefined}
                isCreatingPermission={vm.isCreatingPermission}
              />
            </div>
          </>
        )}

        {/* ============================
                LOGIN NOTE
            ============================= */}

        <div className="credential-note">
          The employee will use these
          credentials to sign in to the
          admin portal.
        </div>

        {/* ============================
                ACTIONS
            ============================= */}

        <div className="assign-role-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              resetForm();
              setShowCreate(false);
            }}
            disabled={isCreating}
          >
            Cancel
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={submit}
            disabled={
              isCreating ||
              !employeeId.trim() ||
              !name.trim() ||
              !email.trim() ||
              password.length < 8 ||
              !role.trim() ||
              (roleMode === "new" &&
                permissionIds.length === 0)
            }
          >
            {isCreating
              ? "Creating…"
              : "Create Employee"}
          </button>
        </div>
      </SidePanel>
    </section>
  );
}