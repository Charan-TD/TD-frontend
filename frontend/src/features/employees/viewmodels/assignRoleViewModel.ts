import { useMemo, useState } from "react";
import { can, type PermissionMap } from "../../admin/models/access";

import {
  useAssignEmployeeAccessMutation,
  useGetEmployeesQuery,
  useRestoreEmployeeRoleMutation,
} from "../api/adminUsersApi";

import {
  useCreatePermissionMutation,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
} from "../api/rolesApi";

import type { Employee, PermissionMatrix } from "../models/employee";
import { withLinkedAccess } from "../models/permissions";

import type { Role } from "../api/rolesApi";

type AssignRoleViewModelProps = {
  onSaved?: () => void;
  permissions: PermissionMap;
};


export function buildRolePermissionPayload(
  matrix: PermissionMatrix,
  availablePermissions: Array<{ id: string; permission_name: string }>,
) {
  const byResource = new Map(
    availablePermissions.map((permission) => [
      permission.permission_name.trim().toLowerCase(),
      permission,
    ]),
  );

  // A section's actions also cover its linked behind-the-scenes access.
  return Object.entries(withLinkedAccess(matrix)).flatMap(([resource, actions]) => {
    if (!actions || actions.length === 0) return [];
    const permission = byResource.get(resource.trim().toLowerCase());
    if (!permission) return [];
    return [{ permissionId: permission.id, actions }];
  });
}

/**
 * Gives an employee a role. The API keeps removed assignments (as inactive)
 * and refuses to create a second one for the same role, so a role the
 * employee had before is switched back on instead of created again.
 */
export async function assignOrRestoreRole(
  employee: Employee | null | undefined,
  employeeId: string,
  roleId: string,
  assign: (input: { employeeId: string; roleId: string; status: "active" }) => Promise<unknown>,
  restore: (input: { assignmentId: string }) => Promise<unknown>,
): Promise<"assigned" | "restored"> {
  const existing = employee?.roles.find((role) => role.id === roleId);

  if (existing?.status === "Active") {
    throw new Error("This employee already has this role.");
  }

  if (existing) {
    await restore({ assignmentId: existing.assignmentId });
    return "restored";
  }

  await assign({ employeeId, roleId, status: "active" });
  return "assigned";
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (error as { data?: unknown }).data;

    if (typeof data === "string") {
      return data;
    }

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
    ) {
      return (data as { message: string }).message;
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Something went wrong. Please try again.";
}

export function useAssignRoleViewModel(
  props: AssignRoleViewModelProps
) {
  const { onSaved, permissions: authPermissions } = props;

  const {
    data: employeesData,
    isLoading: isEmployeesLoading,
    isFetching: isEmployeesFetching,
    error: employeesError,
  } = useGetEmployeesQuery({
    all: true,
    includeRoleMetadata:
      can(authPermissions, "employee_roles", "read") &&
      can(authPermissions, "roles", "read"),
  });

  const employees =
    employeesData?.employees ?? [];

  const {
    data: roles = [],
    isLoading: isRolesLoading,
    isFetching: isRolesFetching,
    error: rolesError,
  } = useGetRolesQuery(undefined, {
    skip: !can(authPermissions, "roles", "read"),
  });

  const {
    data: permissions = [],
    isLoading: isPermissionsLoading,
    isFetching: isPermissionsFetching,
    error: permissionsError,
  } = useGetPermissionsQuery(undefined, {
    skip: !can(authPermissions, "permissions", "read"),
  });

  const [assignEmployeeAccess, { isLoading: isAssigning }] =
    useAssignEmployeeAccessMutation();
  const [restoreEmployeeRole, { isLoading: isRestoring }] =
    useRestoreEmployeeRoleMutation();
  const isSaving = isAssigning || isRestoring;

  const [createRoleMutation, { isLoading: isCreatingRole }] =
    useCreateRoleMutation();

  const [updateRoleMutation, { isLoading: isUpdatingRole }] =
    useUpdateRoleMutation();

  const [deleteRoleMutation, { isLoading: isDeletingRole }] =
    useDeleteRoleMutation();

  const [createPermissionMutation, { isLoading: isCreatingPermission }] =
    useCreatePermissionMutation();

  const [employeeId, setEmployeeId] = useState("");
  const [roleName, setRoleName] = useState("");

  const [savedMessage, setSavedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedRole = useMemo<Role | undefined>(() => {
    return roles.find((role) => role.name === roleName);
  }, [roles, roleName]);

  const onSelectEmployee = (id: string) => {
    setEmployeeId(id);
    setSavedMessage("");
    setErrorMessage("");
  };

  const selectRole = (name: string) => {
    setRoleName(name);
    setSavedMessage("");
    setErrorMessage("");
  };

  const save = async () => {
    setSavedMessage("");
    setErrorMessage("");

    if (!employeeId) {
      setErrorMessage("Please select an employee.");
      return false;
    }

    if (!roleName) {
      setErrorMessage("Please select a role.");
      return false;
    }

    try {
      const role = roles.find((item) => item.name === roleName);
      if (!role) {
        setErrorMessage("Selected role was not found.");
        return false;
      }

      const outcome = await assignOrRestoreRole(
        employees.find((item) => item.id === employeeId),
        employeeId,
        role.id,
        (input) => assignEmployeeAccess(input).unwrap(),
        (input) => restoreEmployeeRole(input).unwrap(),
      );

      setSavedMessage(
        outcome === "restored"
          ? "Role restored for this employee."
          : "Role assigned successfully.",
      );

      onSaved?.();

      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
    }
  };

  /**
   * Creates a new role using dynamically selected permission IDs.
   *
   * IMPORTANT:
   * The database relationship is:
   *
   * roles
   *   ↓
   * role_permissions
   *   ↓
   * permissions
   *
   * Therefore permission IDs are the source of truth.
   */
  const createRole = async (
    name: string,
    description: string,
    permissionCode: PermissionMatrix
  ) => {
    setSavedMessage("");
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Role name is required.");
      return null;
    }

    if (Object.values(permissionCode).every((actions) => !actions || actions.length === 0)) {
      setErrorMessage("Please select at least one permission action.");
      return null;
    }

    try {
      const role = await createRoleMutation({
        name: name.trim(),
        description: description.trim(),
        permissions: buildRolePermissionPayload(permissionCode, permissions),
      }).unwrap();

      setRoleName(role.name);

      return role;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  };


  const updateRole = async (
    id: string,
    name: string,
    description: string,
    permissionCode: PermissionMatrix,
  ) => {
    setSavedMessage("");
    setErrorMessage("");

    try {
      const role = await updateRoleMutation({
        id,
        name: name.trim(),
        description: description.trim(),
        permissions: buildRolePermissionPayload(
          permissionCode,
          permissions,
        ),
      }).unwrap();
      setRoleName(role.name);
      setSavedMessage("Role permissions updated successfully.");
      return role;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
    }
  };

  const deleteRole = async (id: string) => {
    setSavedMessage("");
    setErrorMessage("");

    try {
      await deleteRoleMutation({ id }).unwrap();
      setRoleName("");
      setSavedMessage("Role deleted successfully.");
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
    }
  };

  /**
   * Creates a permission dynamically.
   *
   * This is used by PermissionMatrixEditor when the admin
   * wants to add a permission that does not already exist.
   */
  const createPermission = async (permissionName: string) => {
    setSavedMessage("");
    setErrorMessage("");

    if (!permissionName.trim()) {
      setErrorMessage("Permission name is required.");

      return {
        success: false,
      };
    }

    try {
      const permission = await createPermissionMutation({
        permissionName: permissionName.trim(),
      }).unwrap();

      return {
        success: true,
        permission,
      };
    } catch (error) {
      setErrorMessage(getErrorMessage(error));

      return {
        success: false,
      };
    }
  };

  return {
    employees,
    roles,
    permissions,

    employeeId,
    roleName,

    selectedRole,

    isSaving,
    isCreatingRole,
    isUpdatingRole,
    isDeletingRole,
    isCreatingPermission,

    isLoading:
      isEmployeesLoading ||
      isRolesLoading ||
      isPermissionsLoading,

    isFetching:
      isEmployeesFetching ||
      isRolesFetching ||
      isPermissionsFetching,

    error:
      employeesError ||
      rolesError ||
      permissionsError,

    savedMessage,
    errorMessage,

    onSelectEmployee,
    selectRole,
    save,
    createRole,
    updateRole,
    deleteRole,
    createPermission,
  };
}