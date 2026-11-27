"use client";

import { useEffect, useRef, useState } from "react";
import { useAssignRoleViewModel, assignOrRestoreRole, getErrorMessage } from "../viewmodels/assignRoleViewModel";
import { useAssignEmployeeAccessMutation, useRemoveEmployeeRoleMutation, useRestoreEmployeeRoleMutation } from "../api/adminUsersApi";
import { can, type PermissionMap } from "../../admin/models/access";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { PermissionMatrixEditor } from "../components/PermissionMatrixEditor";
import type { Employee, PermissionMatrix } from "../models/employee";
import { ConfirmDialog } from "../../admin/components/ConfirmDialog";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { RequiredFieldMark } from "../../admin/components/RequiredFieldMark";
import { InitialsAvatar } from "../../admin/components/InitialsAvatar";
import { Icon } from "../../admin/components/Icon";
import { Skeleton } from "../../admin/components/Skeleton";

const sameMatrix = (a: PermissionMatrix, b: PermissionMatrix) => {
  const norm = (m: PermissionMatrix) => JSON.stringify(Object.entries(m).filter(([, v]) => (v ?? []).length).map(([k, v]) => [k, [...(v ?? [])].sort()]).sort());
  return norm(a) === norm(b);
};

/**
 * Roles & Access: pick a role on the left, then change its name, the people who
 * have it, and what it can view or edit. One Save applies everything.
 */
export function AssignRoleView({ permissions }: { onBack?: () => void; permissions: PermissionMap }) {
  const vm = useAssignRoleViewModel({ permissions });
  const [assignAccess] = useAssignEmployeeAccessMutation();
  const [removeAccess] = useRemoveEmployeeRoleMutation();
  const [restoreAccess] = useRestoreEmployeeRoleMutation();

  const canCreateRole = can(permissions, "roles", "insert");
  const canUpdateRole = can(permissions, "roles", "update");
  const canDeleteRole = can(permissions, "roles", "delete");
  const canAssign = can(permissions, "employee_roles", "insert");
  const canRemove = can(permissions, "employee_roles", "delete");

  const [creating, setCreating] = useState(false);
  const activeRole = creating ? undefined : vm.selectedRole ?? vm.roles[0];

  const [formKey, setFormKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Load the chosen role into the form whenever the selection changes.
  const key = creating ? "new" : activeRole?.id ?? null;
  if (key !== formKey) {
    setFormKey(key);
    setName(activeRole?.name ?? "");
    setDescription(activeRole?.description ?? "");
    setMatrix(activeRole?.matrix ?? {});
    setAddedIds([]);
    setRemovedIds([]);
    setMenuOpen(false);
    setLocalError("");
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const membersOf = (roleId: string) => vm.employees.filter((employee) => employee.roles.some((role) => role.id === roleId && role.status === "Active"));
  const currentMembers = activeRole ? membersOf(activeRole.id) : [];
  const shownMembers: Employee[] = [
    ...currentMembers.filter((employee) => !removedIds.includes(employee.id)),
    ...vm.employees.filter((employee) => addedIds.includes(employee.id)),
  ];
  const shownIds = new Set(shownMembers.map((employee) => employee.id));
  const candidates = vm.employees.filter((employee) => !shownIds.has(employee.id));

  const dirty = creating
    ? Boolean(name.trim() || description.trim() || addedIds.length || Object.keys(matrix).length)
    : Boolean(activeRole) && (name.trim() !== activeRole!.name || description.trim() !== activeRole!.description || !sameMatrix(matrix, activeRole!.matrix) || addedIds.length > 0 || removedIds.length > 0);

  const busy = saving || vm.isCreatingRole || vm.isUpdatingRole;
  const saveBlocked = disabledReason(
    [busy, "Please wait, your changes are being saved"],
    [creating ? !canCreateRole : !canUpdateRole, noAccess(creating ? "create roles" : "change roles")],
    [!name.trim(), "Enter a role name"],
    [!dirty, "Nothing has changed yet"],
    [creating && Object.values(matrix).every((actions) => !actions || actions.length === 0), "Give the role at least one permission"],
  );

  const applyMembers = async (roleId: string) => {
    for (const employeeId of removedIds) {
      const assignment = vm.employees.find((employee) => employee.id === employeeId)?.roles.find((role) => role.id === roleId && role.status === "Active");
      if (assignment) await removeAccess({ assignmentId: assignment.assignmentId }).unwrap();
    }
    for (const employeeId of addedIds) {
      const employee = vm.employees.find((item) => item.id === employeeId);
      await assignOrRestoreRole(employee, employeeId, roleId, (input) => assignAccess(input).unwrap(), (input) => restoreAccess(input).unwrap());
    }
  };

  const save = async () => {
    setLocalError("");
    setLocalMessage("");
    setSaving(true);
    try {
      if (creating) {
        const role = await vm.createRole(name, description, matrix);
        if (!role) return;
        await applyMembers(role.id);
        setCreating(false);
        vm.selectRole(role.name);
        setLocalMessage("Role created successfully.");
      } else if (activeRole) {
        const role = await vm.updateRole(activeRole.id, name, description, matrix);
        if (!role) return;
        await applyMembers(activeRole.id);
        setAddedIds([]);
        setRemovedIds([]);
        setLocalMessage("Role saved successfully.");
      }
    } catch (error) {
      setLocalError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (creating) { setCreating(false); return; }
    setFormKey(null); // reloads the form from the saved role
  };

  const memberCount = (roleId: string) => membersOf(roleId).length;
  const title = creating ? "New role" : null;

  if (vm.isLoading && vm.roles.length === 0) {
    return (
      <section className="td-roles">
        <aside className="td-card td-roles-list"><Skeleton height={20} width="40%" /><Skeleton height={36} style={{ marginTop: 12 }} /><Skeleton height={36} style={{ marginTop: 8 }} /></aside>
        <div className="td-card"><Skeleton height={44} /><Skeleton height={200} style={{ marginTop: 14 }} /></div>
      </section>
    );
  }

  return (
    <section className="td-roles">
      <aside className="td-card td-roles-list">
        <header><h3>Roles</h3><p>{vm.roles.length} {vm.roles.length === 1 ? "role" : "roles"}{creating ? "" : " · pick one to edit its access"}</p></header>
        <ul>
          {vm.roles.map((role) => {
            const count = memberCount(role.id);
            const selected = !creating && activeRole?.id === role.id;
            return (
              <li key={role.id}>
                <button type="button" className={selected ? "is-selected" : ""} aria-current={selected ? "true" : undefined} onClick={() => { setCreating(false); vm.selectRole(role.name); }}>
                  <Icon name="bag" size={14} /><span>{role.name}</span><small>{count} {count === 1 ? "member" : "members"}</small>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className={"td-new-role" + (creating ? " is-selected" : "")} disabled={!canCreateRole}
          data-tooltip={canCreateRole ? undefined : noAccess("create roles")} data-tooltip-kind={canCreateRole ? undefined : "access"}
          onClick={() => setCreating(true)}>
          <Icon name="plus" size={13} />New role
        </button>
      </aside>

      <div className="td-card td-roles-editor">
        <TransientSuccessMessage message={localMessage || vm.savedMessage} />
        {(localError || vm.errorMessage) && <div className="api-state api-state--error">{localError || vm.errorMessage}</div>}

        {!creating && !activeRole ? (
          <div className="api-state">No roles yet. Create one to get started.</div>
        ) : (
          <>
            {title && <h3 className="td-roles-title">{title}</h3>}
            <div className="td-form-row">
              <label>
                <span>Role name{creating && <RequiredFieldMark />}</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Station manager" disabled={busy || (creating ? !canCreateRole : !canUpdateRole)} autoFocus={creating} />
              </label>
              <label>
                <span>Description</span>
                <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={creating ? "What does this role do? (optional)" : "Describe this role"} disabled={busy || (creating ? !canCreateRole : !canUpdateRole)} />
              </label>
            </div>

            <div className="td-members">
              <div className="td-members-head">
                <div>
                  <strong>Employees in this role</strong>
                  <p>{shownMembers.length === 0 ? "Everyone you add gets the access below" : `${shownMembers.length} ${shownMembers.length === 1 ? "employee gets" : "employees get"} the access below`}</p>
                </div>
                <div className="td-addrole" ref={menuRef}>
                  <button type="button" className="td-btn td-btn--brand-outline" disabled={!canAssign || busy || candidates.length === 0} onClick={() => setMenuOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={menuOpen}
                    data-tooltip={!canAssign ? noAccess("add employees to roles") : candidates.length === 0 ? "Everyone already has this role" : undefined} data-tooltip-kind={canAssign ? undefined : "access"}>
                    <Icon name="plus" size={13} />Add employee
                  </button>
                  {menuOpen && (
                    <ul className="td-menu td-menu--list" role="listbox">
                      {candidates.map((employee) => (
                        <li key={employee.id}>
                          <button type="button" role="option" aria-selected="false" onClick={() => {
                            setMenuOpen(false);
                            if (removedIds.includes(employee.id)) setRemovedIds((ids) => ids.filter((id) => id !== employee.id));
                            else setAddedIds((ids) => [...ids, employee.id]);
                          }}><InitialsAvatar name={employee.name} imageUrl={employee.profileImgUrl} size={22} />{employee.name}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {shownMembers.length === 0 ? (
                <div className="td-members-empty">No employees added yet. You can also add them later.</div>
              ) : (
                <div className="td-chip-row">
                  {shownMembers.map((employee) => (
                    <span className="td-member-chip" key={employee.id}>
                      <InitialsAvatar name={employee.name} imageUrl={employee.profileImgUrl} size={22} />{employee.name}
                      <button type="button" aria-label={`Remove ${employee.name} from this role`} disabled={!canRemove || busy}
                        data-tooltip={!canRemove ? noAccess("remove roles from employees") : undefined} data-tooltip-kind={canRemove ? undefined : "access"}
                        onClick={() => { if (addedIds.includes(employee.id)) setAddedIds((ids) => ids.filter((id) => id !== employee.id)); else setRemovedIds((ids) => [...ids, employee.id]); }}><Icon name="close" size={10} stroke={2.6} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <PermissionMatrixEditor
              title="Access"
              description="Tick what everyone with this role can see and change."
              canSetUpSections={can(permissions, "permissions", "insert")}
              value={matrix}
              permissions={vm.permissions}
              onChange={setMatrix}
              disabled={busy || (creating ? !canCreateRole : !canUpdateRole)}
            />

            <footer className="td-roles-foot">
              {!creating && activeRole ? (
                <button type="button" className="td-link-danger" disabled={!canDeleteRole || vm.isDeletingRole || busy} onClick={() => setConfirmDelete(true)}
                  data-tooltip={!canDeleteRole ? noAccess("delete roles") : undefined} data-tooltip-kind={canDeleteRole ? undefined : "access"}>
                  {vm.isDeletingRole ? "Deleting…" : "Delete role"}
                </button>
              ) : <span />}
              <div>
                <button type="button" className="td-btn" onClick={cancel} disabled={busy}>Cancel</button>
                <button type="button" className="td-btn td-btn--primary" onClick={save} disabled={Boolean(saveBlocked)} data-tooltip={saveBlocked}>
                  {busy ? "Saving…" : creating ? "Create role" : "Save changes"}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete && Boolean(activeRole)}
        tone="danger"
        title="Delete role?"
        message={<>You are about to delete <strong>{activeRole?.name}</strong>.<br />This action cannot be undone.</>}
        confirmLabel="Delete role"
        busyLabel="Deleting..."
        busy={vm.isDeletingRole}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (activeRole) await vm.deleteRole(activeRole.id);
          setConfirmDelete(false);
        }}
      />
    </section>
  );
}
