"use client";

import { useMemo, useState } from "react";
import { can, type PermissionMap } from "../../admin/models/access";
import {
  useAssignEmployeeAccessMutation,
  useGetEmployeesQuery,
  useRemoveEmployeeRoleMutation,
  useUpdateEmployeeMutation,
} from "../api/adminUsersApi";
import {
  useGetPermissionsQuery,
  useGetRolesQuery,
  useUpdateRoleMutation,
} from "../api/rolesApi";
import type { PermissionMatrix } from "../models/employee";
import { buildRolePermissionPayload, getErrorMessage } from "./assignRoleViewModel";

export function useEmployeeDetailsViewModel(employeeId: string | null, authPermissions: PermissionMap = {}) {
  const { data, isLoading } = useGetEmployeesQuery({ page: 1, limit: 100, includeRoleMetadata: true });
  const employees = data?.employees ?? [];

  const employee = useMemo(
    () => (employeeId ? employees.find((emp) => emp.id === employeeId) ?? null : null),
    [employees, employeeId]
  );

  const { data: roles = [] } = useGetRolesQuery(undefined, {
    skip: !can(authPermissions, "roles", "read"),
  });
  const { data: permissions = [] } = useGetPermissionsQuery(undefined, {
    skip: !can(authPermissions, "permissions", "read"),
  });

  const [updateEmployeeMutation, { isLoading: isUpdatingEmployee }] = useUpdateEmployeeMutation();
  const [updateRoleMutation, { isLoading: isUpdatingRole }] = useUpdateRoleMutation();
  const [assignEmployeeAccess, { isLoading: isAssigningRole }] = useAssignEmployeeAccessMutation();
  const [removeEmployeeRoleMutation, { isLoading: isRemovingRole }] = useRemoveEmployeeRoleMutation();

  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const run = async (action: () => Promise<unknown>, success: string) => {
    setSavedMessage("");
    setErrorMessage("");
    try {
      await action();
      setSavedMessage(success);
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
    }
  };

  const updateDetails = (name: string, email: string) => {
    if (!employee) return Promise.resolve(false);
    if (!name.trim() || !email.trim()) {
      setErrorMessage("Name and email are required.");
      return Promise.resolve(false);
    }
    return run(
      () => updateEmployeeMutation({ id: employee.id, name, email }).unwrap(),
      "Employee details updated successfully."
    );
  };

  const updateRole = (id: string, name: string, description: string, matrix: PermissionMatrix) => {
    if (!name.trim()) {
      setErrorMessage("Role name is required.");
      return Promise.resolve(false);
    }
    return run(
      () =>
        updateRoleMutation({
          id,
          name,
          description,
          permissions: buildRolePermissionPayload(matrix, permissions),
        }).unwrap(),
      "Role updated successfully."
    );
  };

  const addRole = (roleId: string) => {
    if (!employee) return Promise.resolve(false);
    return run(
      () => assignEmployeeAccess({ employeeId: employee.id, roleId, status: "active" }).unwrap(),
      "Role assigned successfully."
    );
  };

  const removeRole = (assignmentId: string) =>
    run(() => removeEmployeeRoleMutation({ assignmentId }).unwrap(), "Role removed from employee.");

  return {
    employee,
    isLoading,
    roles,
    permissions,

    isUpdatingEmployee,
    isUpdatingRole,
    isAssigningRole,
    isRemovingRole,

    savedMessage,
    errorMessage,

    updateDetails,
    updateRole,
    addRole,
    removeRole,
  };
}
