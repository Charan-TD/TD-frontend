"use client";

import { useEffect, useState } from "react";
import type { PermissionMatrix } from "../models/employee";
import { can, type PermissionMap } from "../../admin/models/access";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { Icon } from "../../admin/components/Icon";
import { RequiredFieldMark } from "../../admin/components/RequiredFieldMark";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { PageFooter } from "../../admin/components/PageFooter";
import { InitialsAvatar } from "../../admin/components/InitialsAvatar";
import { StatusSwitch } from "../../admin/components/StatusSwitch";
import { EmployeeDetailsView } from "./EmployeeDetailsView";

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
  permissions,
  autoOpenCreate = false,
  onAutoOpenHandled,
  onOpenDetails,
  detailsId,
  onCloseDetails,
  onAssignRole,
}: {
  permissions: PermissionMap;
  /** Opens the "Add employee" panel automatically (e.g. from the topbar quick action). */
  autoOpenCreate?: boolean;
  onAutoOpenHandled?: () => void;
  /** Opens the employee profile (view / edit). */
  onOpenDetails?: (employeeId: string) => void;
  /** When set, that employee's panel is shown over the list. */
  detailsId?: string | null;
  onCloseDetails?: () => void;
  onAssignRole?: () => void;
}) {
  const vm = useEmployeesViewModel(permissions);
  const canAddEmployee = can(permissions, "employees", "insert");
  const canCreatePermission = can(permissions, "permissions", "insert");
  const canChangeStatus = can(permissions, "employees", "update");

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Pre-fills a suggested value until the user edits it; intentionally follows the suggestion.
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

    // eslint-disable-next-line react-hooks/set-state-in-effect -- One-shot trigger from the parent flag; adding the omitted deps would re-run it and reset the form.
    resetForm();
    setEmployeeId(vm.suggestedEmployeeId);
    setShowCreate(true);
    onAutoOpenHandled?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- One-shot trigger from the parent flag; adding the omitted deps would re-run it and reset the form.
  }, [autoOpenCreate, canAddEmployee]);

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
    <section className="td-page">
      <SectionSearch value={vm.query} onChange={vm.setQuery} placeholder="Search employees by name, ID or email" />
      <SectionActions>
        <button type="button" className={"td-top-btn td-top-btn--primary" + (canAddEmployee ? "" : " is-disabled")} aria-disabled={!canAddEmployee}
          data-tooltip={canAddEmployee ? undefined : noAccess("add employees")} data-tooltip-kind={canAddEmployee ? undefined : "access"}
          onClick={() => { if (!canAddEmployee) return; resetForm(); setEmployeeId(vm.suggestedEmployeeId); setShowCreate(true); }}>
          <Icon name="plus" size={14} stroke={2.4} />Add employee
        </button>
      </SectionActions>

      <TransientSuccessMessage message={vm.savedMessage} />
      {vm.errorMessage && <div className="api-state api-state--error">{vm.errorMessage}</div>}

      <div className={"td-table-card" + (vm.isFetching ? " is-refreshing" : "")}>
        <div className="td-table-card-head">
          <StatusTabs placement="inline" label="Filter employees by status" value={vm.statusFilter} onChange={(value) => vm.setStatusFilter(value as "all" | "active" | "inactive")}
            tabs={[{ id: "all", label: "All", count: vm.employeeCounts.all }, { id: "active", label: "Active", count: vm.employeeCounts.active }, { id: "inactive", label: "Inactive", count: vm.employeeCounts.inactive }]} />
        </div>

        {vm.isLoading && <SkeletonTable columns={["Member", "Employee ID", "Email", "Role", "Status"]} />}
        {vm.isError && !vm.isLoading && <div className="api-state api-state--error">Unable to load staff records.</div>}

        {!vm.isLoading && !vm.isError && (
          <div className="td-table-scroll">
            <table className="td-table">
              <thead>
                <tr><th>Member</th><th>Employee ID</th><th>Email</th><th>Role</th><th>Status</th></tr>
              </thead>
              <tbody>
                {vm.employees.map((employee) => (
                  <tr
                    key={employee.id}
                    className={onOpenDetails ? "is-clickable" : undefined}
                    tabIndex={onOpenDetails ? 0 : undefined}
                    aria-label={onOpenDetails ? `Open details for ${employee.name}` : undefined}
                    onClick={onOpenDetails ? () => onOpenDetails(employee.id) : undefined}
                    onKeyDown={(event) => {
                      if (onOpenDetails && (event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                        event.preventDefault();
                        onOpenDetails(employee.id);
                      }
                    }}
                  >
                    <td><div className="td-member"><InitialsAvatar name={employee.name} imageUrl={employee.profileImgUrl} /><strong>{employee.name}</strong></div></td>
                    <td className="td-muted">{employee.empId}</td>
                    <td className="td-muted">{employee.email}</td>
                    <td>
                      {employee.roles.length ? (
                        <span className="td-chip-row">
                          {employee.roles.map((role) => (
                            <span key={role.id} className="td-role-chip" data-tooltip={role.status === "Inactive" ? "Inactive assignment" : undefined} style={role.status === "Inactive" ? { opacity: 0.5 } : undefined}>{role.name}</span>
                          ))}
                        </span>
                      ) : <span className="td-muted">Unassigned</span>}
                    </td>
                    <td>
                      <StatusSwitch
                        checked={employee.status === "Active"}
                        label={`Status of ${employee.name}`}
                        disabled={!canChangeStatus || vm.isUpdatingStatus}
                        tooltip={!canChangeStatus ? noAccess("activate or deactivate employees") : vm.isUpdatingStatus ? "Please wait, another status change is being saved" : undefined}
                        tooltipKind={canChangeStatus ? undefined : "access"}
                        onChange={(on) => vm.updateStatus(employee.id, on ? "Active" : "Inactive")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!vm.employees.length && (
              <div className="api-state">{vm.query.trim() ? `No employees match "${vm.query.trim()}".` : "No employees found."}</div>
            )}
          </div>
        )}

        {!vm.isLoading && !vm.isError && vm.totalEmployees > 0 && (
          <PageFooter page={vm.page} totalPages={vm.totalPages} total={vm.totalEmployees} pageSize={vm.pageSize} shown={vm.employees.length} noun="employees" onChange={vm.setPage} disabled={vm.isFetching} />
        )}
      </div>

      {detailsId && onCloseDetails && (
        <EmployeeDetailsView key={detailsId} employeeId={detailsId} permissions={permissions} onBack={onCloseDetails} onAssignRole={onAssignRole ?? onCloseDetails} />
      )}

      {/* ================================
          CREATE EMPLOYEE MODAL
      ================================= */}

      <SidePanel
        open={showCreate}
        onClose={() => { resetForm(); setShowCreate(false); }}
        title="Add employee"
        description="Create an account and assign a role."
        closeDisabled={isCreating}
        footer={(
          <>
            <button type="button" className="td-btn" onClick={() => { resetForm(); setShowCreate(false); }} disabled={isCreating}
              data-tooltip={isCreating ? "Please wait, the employee is being created" : undefined}>Cancel</button>
            <button type="button" className="td-btn td-btn--primary" onClick={submit} disabled={Boolean(createBlockedReason)} data-tooltip={createBlockedReason}>
              <Icon name="plus" size={14} stroke={2.4} />{isCreating ? "Creating…" : "Create employee"}
            </button>
          </>
        )}
      >
        <div className="td-form">
          <div className="td-form-row">
            <label>
              <span>Employee ID<RequiredFieldMark /></span>
              <input value={employeeId} onChange={(event) => { setEmployeeIdEdited(true); setEmployeeId(event.target.value); }} placeholder="Enter employee ID" disabled={isCreating} required />
              <small>Suggested next ID</small>
            </label>
            <label>
              <span>Name<RequiredFieldMark /></span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" disabled={isCreating} required />
            </label>
          </div>

          <label>
            <span>Email<RequiredFieldMark /></span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" disabled={isCreating} required />
          </label>

          <label>
            <span>Password<RequiredFieldMark /></span>
            <span className="td-password">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="Minimum 8 characters" autoComplete="new-password" disabled={isCreating} required />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                <Icon name={showPassword ? "eye-off" : "eye"} size={15} />
              </button>
            </span>
          </label>

          <div className="td-divider" />

          <div className="td-field">
            <span className="td-field-label">Role assignment</span>
            <div className="td-segment" role="tablist" aria-label="Role assignment">
              <button type="button" role="tab" aria-selected={roleMode === "existing"} className={roleMode === "existing" ? "is-active" : ""} disabled={isCreating}
                onClick={() => { setRoleMode("existing"); setRole(""); setRoleDescription(""); setPermissionMatrix({}); }}>Assign existing role</button>
              <button type="button" role="tab" aria-selected={roleMode === "new"} className={roleMode === "new" ? "is-active" : ""} disabled={isCreating}
                onClick={() => { setRoleMode("new"); setRole(""); setRoleDescription(""); setPermissionMatrix({}); }}>Create new role</button>
            </div>
          </div>

          {roleMode === "existing" && (
            <>
              <label>
                <span>Existing role<RequiredFieldMark /></span>
                <RoleSearchSelect roles={vm.roles} value={role} onChange={setRole} disabled={isCreating} placeholder="Select role" />
              </label>
              <div className="td-note-box"><Icon name="info" size={14} /><span>The employee will use this email and password to sign in to the admin portal.</span></div>
            </>
          )}

          {roleMode === "new" && (
            <>
              <div className="td-form-row">
                <label>
                  <span>New role name<RequiredFieldMark /></span>
                  <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Station manager" disabled={isCreating} required />
                </label>
                <label>
                  <span>Description</span>
                  <input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} placeholder="Optional" disabled={isCreating} />
                </label>
              </div>
              <PermissionMatrixEditor
                compact
                title="Permissions"
                description="Tick what this role can see and change."
                canSetUpSections={canCreatePermission}
                value={permissionMatrix}
                permissions={vm.permissions}
                onChange={setPermissionMatrix}
                disabled={isCreating}
              />
              <div className="td-note-box"><Icon name="info" size={14} /><span>The employee will use this email and password to sign in to the admin portal.</span></div>
            </>
          )}
        </div>
      </SidePanel>
    </section>
  );
}
