import { useMemo, useState } from "react";

import {
  useAssignEmployeeAccessMutation,
  useGetEmployeesQuery,
} from "../api/adminUsersApi";

import {
  useCreatePermissionMutation,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
} from "../api/rolesApi";

import type { PermissionMatrix } from "../models/employee";

import type { Role } from "../api/rolesApi";

type AssignRoleViewModelProps = {
  onSaved?: () => void;
};

function getErrorMessage(error: unknown): string {
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
  props: AssignRoleViewModelProps = {}
) {
  const { onSaved } = props;

  const {
    data: employeesData,
    isLoading: isEmployeesLoading,
    isFetching: isEmployeesFetching,
    error: employeesError,
  } = useGetEmployeesQuery({
    page: 1,
    limit: 100,
  });

  const employees =
    employeesData?.employees ?? [];

  const {
    data: roles = [],
    isLoading: isRolesLoading,
    isFetching: isRolesFetching,
    error: rolesError,
  } = useGetRolesQuery();

  const {
    data: permissions = [],
    isLoading: isPermissionsLoading,
    isFetching: isPermissionsFetching,
    error: permissionsError,
  } = useGetPermissionsQuery();

  const [assignEmployeeAccess, { isLoading: isSaving }] =
    useAssignEmployeeAccessMutation();

  const [createRoleMutation, { isLoading: isCreatingRole }] =
    useCreateRoleMutation();

  const [updateRoleMutation, { isLoading: isUpdatingRole }] =
    useUpdateRoleMutation();

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

      await assignEmployeeAccess({
        employeeId,
        roleId: role.id,
        status: "active",
      }).unwrap();

      setSavedMessage("Role assigned successfully.");

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
    permissionIds: string[],
    permissionCode: PermissionMatrix
  ) => {
    setSavedMessage("");
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Role name is required.");
      return null;
    }

    if (permissionIds.length === 0) {
      setErrorMessage("Please select at least one permission.");
      return null;
    }

    try {
      const role = await createRoleMutation({
        name: name.trim(),
        description: description.trim(),
        permissionIds,
        permissionCode,
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
    permissionIds: string[],
  ) => {
    setSavedMessage("");
    setErrorMessage("");

    try {
      const role = await updateRoleMutation({
        id,
        name: name.trim(),
        description: description.trim(),
        permissionIds,
      }).unwrap();
      setRoleName(role.name);
      setSavedMessage("Role permissions updated successfully.");
      return role;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return null;
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
    createPermission,
  };
}