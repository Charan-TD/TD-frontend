"use client";

import { useEffect, useState } from "react";
import type { PermissionMatrix } from "../models/employee";
import { can, type PermissionMap } from "../../admin/models/access";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { Icon } from "../../admin/components/Icon";

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

import {
  SkeletonTable,
} from "../../admin/components/Skeleton";


export function EmployeesView({
  onManageRoles,
  permissions,
  autoOpenCreate = false,
  onAutoOpenHandled,
  onOpenDetails,
}: {
  onManageRoles?: () => void;
  permissions: PermissionMap;
  /** Opens the "Add employee" panel automatically (e.g. from the topbar quick action). */
  autoOpenCreate?: boolean;
  onAutoOpenHandled?: () => void;
  /** Opens the employee profile (view / edit). */
  onOpenDetails?: (employeeId: string) => void;
}) {
  const vm = useEmployeesViewModel(permissions);
  const canAddEmployee = can(permissions, "employees", "insert");
  const canCreateRole = can(permissions, "roles", "insert");
  const canCreatePermission = can(permissions, "permissions", "insert");
  const canChangeStatus = can(permissions, "employees", "update");
  const canOpenRoles = canCreateRole || can(permissions, "roles", "read");

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);

  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  // True once the admin types their own ID; until then the field
  // follows the suggestion so it never shows a stale fallback.
  const [
    employeeIdEdited,
    setEmployeeIdEdited,
  ] = useState(false);

  useEffect(() => {
    if (showCreate && !employeeIdEdited) {
      setEmployeeId(vm.suggestedEmployeeId);
    }
  }, [showCreate, employeeIdEdited, vm.suggestedEmployeeId]);

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
    permissionMatrix,
    setPermissionMatrix,
  ] = useState<PermissionMatrix>({});

  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setShowPassword(false);
    setEmployeeId("");
    setEmployeeIdEdited(false);
    setName("");
    setEmail("");
    setPassword("");
    setRoleMode("existing");
    setRole("");
    setRoleDescription("");
    setPermissionMatrix({});
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
      Object.values(permissionMatrix).every((actions) => !actions || actions.length === 0)
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
        permissionCode: permissionMatrix,
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

  const createBlockedReason = disabledReason(
    [isCreating, "Please wait, the employee is being created"],
    [!employeeId.trim(), "Enter an employee ID"],
    [!name.trim(), "Enter the employee's name"],
    [!email.trim(), "Enter the employee's email"],
    [password.length < 8, "Password must be at least 8 characters"],
    [!role.trim(), roleMode === "new" ? "Enter a name for the new role" : "Select a role"],
    [
      roleMode === "new" &&
        Object.values(permissionMatrix).every((actions) => !actions || actions.length === 0),
      "Give the new role at least one permission",
    ],
  );

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
            data-tooltip={vm.isFetching ? "Already refreshing the employee list" : undefined}
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
              disabled={!canOpenRoles}
              data-tooltip={canOpenRoles ? undefined : noAccess("view or manage roles")}
              data-tooltip-kind="access"
            >
              Roles &amp; access
            </button>
          )}

          <button
            className="primary-button"
            type="button"
            disabled={!canAddEmployee}
            data-tooltip={canAddEmployee ? undefined : noAccess("add employees")}
            data-tooltip-kind="access"
            onClick={() => {
              resetForm();
              setEmployeeId(vm.suggestedEmployeeId);
              setShowCreate(true);
            }}
          >
            Add employee
          </button>
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
        <SkeletonTable
          columns={["Member", "Employee Id", "Mail", "Role", "Status", "Action"]}
        />
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
          <div className={`employee-table-wrap${vm.isFetching ? " is-refreshing" : ""}`}>
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
                        {employee.roles.length ? (
                          <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
                            {employee.roles.map((role) => (
                              <span
                                key={role.id}
                                className="role-pill"
                                data-tooltip={role.status === "Inactive" ? "Inactive assignment" : undefined}
                                style={role.status === "Inactive" ? { opacity: 0.5 } : undefined}
                              >
                                {role.name}
                              </span>
                            ))}
                          </span>
                        ) : (
                          "Unassigned"
                        )}
                      </td>

                      <td>
                        <span className="role-pill">
                          {employee.status}
                        </span>
                      </td>

                      <td>
                        {onOpenDetails && (
                          <button
                            className="table-action"
                            type="button"
                            onClick={() =>
                              onOpenDetails(employee.id)
                            }
                          >
                            View
                          </button>
                        )}

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
                            !canChangeStatus ||
                            vm.isUpdatingStatus
                          }
                          data-tooltip={!canChangeStatus ? noAccess("activate or deactivate employees") : vm.isUpdatingStatus ? "Please wait, another status change is being saved" : undefined}
                          data-tooltip-kind={canChangeStatus ? undefined : "access"}
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
                {vm.query.trim()
                  ? `No employees match "${vm.query.trim()}".`
                  : "No employees found."}
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
                data-tooltip={vm.page === 1 ? "You are already on the first page" : vm.isFetching ? "Still loading, please wait" : undefined}
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
                data-tooltip={vm.page === vm.totalPages ? "You are already on the last page" : vm.isFetching ? "Still loading, please wait" : undefined}
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
              onChange={(event) => {
                setEmployeeIdEdited(true);
                setEmployeeId(
                  event.target.value
                );
              }}
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

            <span className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                minLength={8}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                disabled={isCreating}
              />

              <button
                type="button"
                className="password-field__toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                data-tooltip={showPassword ? "Hide password" : "Show password"}
                data-tooltip-icon={showPassword ? "eye-off" : "eye"}
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={15} />
              </button>
            </span>
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
                setPermissionMatrix({});
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
                setPermissionMatrix({});
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
                      selectedRole.matrix
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
                value={permissionMatrix}
                permissions={vm.permissions}
                onChange={setPermissionMatrix}
                disabled={isCreating}
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
            data-tooltip={isCreating ? "Please wait, the employee is being created" : undefined}
          >
            Cancel
          </button>

          <button
            className="primary-button"
            type="button"
            onClick={submit}
            disabled={Boolean(createBlockedReason)}
            data-tooltip={createBlockedReason}
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