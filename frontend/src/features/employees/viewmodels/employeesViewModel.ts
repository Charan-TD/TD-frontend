"use client";

import { useMemo, useState } from "react";
import { can, type PermissionMap } from "../../admin/models/access";

import {
  useCreateEmployeeMutation,
  useGetEmployeesQuery,
  useGetLastEmployeeIdQuery,
  useUpdateEmployeeStatusMutation,
} from "../api/adminUsersApi";

import {
  useCreatePermissionMutation,
  useCreateRoleMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
} from "../api/rolesApi";

import type {
  EmployeeStatus,
  PermissionMatrix,
} from "../models/employee";

import { buildRolePermissionPayload } from "./assignRoleViewModel";

type CreateEmployeeFormInput = {
  empId: string;
  name: string;
  email: string;
  password: string;
  roleMode: "existing" | "new";
  roleName: string;
  roleDescription?: string;
  permissionCode?: PermissionMatrix;
};

const PAGE_SIZE = 8;

export type EmployeeFilter = "all" | "active" | "inactive";

export function useEmployeesViewModel(authPermissions: PermissionMap) {
  const [statusFilter, setStatusFilter] = useState<EmployeeFilter>("all");
  const [page, setPage] =
    useState(1);

  const [query, setQueryValue] =
    useState("");

  const searchTerm = query.trim().toLowerCase();
  const isSearching = searchTerm.length > 0;

  const includeRoleMetadata =
    can(authPermissions, "employee_roles", "read") &&
    can(authPermissions, "roles", "read");

  // Fetch the list once so status tabs, counts, search, and pagination all
  // operate on the same complete set of employees.
  const allQuery = useGetEmployeesQuery({ all: true, includeRoleMetadata });
  const activeQuery = allQuery;
  const { isLoading, isFetching, isError, refetch } = activeQuery;
  const allEmployees = activeQuery.data?.employees ?? [];

  const matchingEmployees = useMemo(() => {
    const needle = searchTerm;
    return allEmployees.filter((employee) => {
      const statusMatches = statusFilter === "all" ||
        (statusFilter === "active" ? employee.status === "Active" : employee.status === "Inactive");
      const textMatches = !needle ||
        [employee.name, employee.email, employee.empId, employee.role]
          .some((value) => value.toLowerCase().includes(needle));
      return statusMatches && textMatches;
    });
  }, [allEmployees, searchTerm, statusFilter]);

  const employeeCounts = useMemo(() => ({
    all: allEmployees.length,
    active: allEmployees.filter((employee) => employee.status === "Active").length,
    inactive: allEmployees.filter((employee) => employee.status === "Inactive").length,
  }), [allEmployees]);

  const totalEmployees = matchingEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / PAGE_SIZE));
  const employees = matchingEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setStatus = (next: EmployeeFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  // A new search starts from the first page of its results.
  const setQuery = (value: string) => {
    setQueryValue(value);
    setPage(1);
  };

  const {
    data: roles = [],
    isFetching:
    isRolesFetching,
  } = useGetRolesQuery(undefined, {
    skip: !can(authPermissions, "roles", "read"),
  });

  const {
    data: permissions = [],
    isFetching:
    isPermissionsFetching,
  } = useGetPermissionsQuery(undefined, {
    skip: !can(authPermissions, "permissions", "read"),
  });

  const {
    data: lastEmployeeId,
  } =
    useGetLastEmployeeIdQuery();
  const suggestedEmployeeId = useMemo(() => {
    if (!lastEmployeeId) {
      return "EMP-1001";
    }

    const match = lastEmployeeId.match(/(\d+)$/);

    if (!match) {
      return lastEmployeeId;
    }

    const number = Number(match[1]) + 1;

    return `${lastEmployeeId.slice(
      0,
      -match[1].length
    )}${number}`;
  }, [lastEmployeeId]);

  const [
    createEmployee,
    {
      isLoading: isCreating,
    },
  ] =
    useCreateEmployeeMutation();

  const [
    createRole,
    {
      isLoading:
      isCreatingRole,
    },
  ] =
    useCreateRoleMutation();

  const [
    updateEmployeeStatus,
    {
      isLoading:
      isUpdatingStatus,
    },
  ] =
    useUpdateEmployeeStatusMutation();

  const [
    createPermission,
    {
      isLoading:
      isCreatingPermission,
    },
  ] =
    useCreatePermissionMutation();

  const [
    savedMessage,
    setSavedMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const createEmployeeAccount =
    async (
      input: CreateEmployeeFormInput
    ) => {
      setSavedMessage("");
      setErrorMessage("");

      const employeeId =
        input.empId.trim();

      if (!employeeId) {
        setErrorMessage(
          "Employee ID is required."
        );

        return {
          success: false,
        };
      }

      try {
        let roleName = input.roleName.trim();
        let roleId = "";

        if (input.roleMode === "new") {
          if (
            Object.values(input.permissionCode ?? {}).every(
              (actions) => !actions || actions.length === 0
            )
          ) {
            setErrorMessage(
              "Select at least one permission action for the new role."
            );

            return { success: false };
          }

          const createdRole =
            await createRole({
              name: roleName,
              description:
                input.roleDescription ?? "",
              permissions: buildRolePermissionPayload(
                input.permissionCode ?? {},
                permissions,
              ),
            }).unwrap();

          roleName = createdRole.name;
          roleId = createdRole.id;
        } else {
          const existingRole = roles.find(
            (role) => role.name.toLowerCase() === roleName.toLowerCase()
          );

          if (!existingRole) {
            setErrorMessage("Selected role was not found.");
            return { success: false };
          }

          roleId = existingRole.id;
        }

        await createEmployee({
          empId:
            employeeId,
          name:
            input.name.trim(),
          email:
            input.email.trim(),
          password: input.password,
          roleId,
        }).unwrap();

        setSavedMessage(
          "Employee created and role assigned successfully."
        );

        return {
          success: true,
        };
      } catch (error) {
        setErrorMessage(
          getErrorMessage(
            error
          )
        );

        return {
          success: false,
        };
      }
    };

  const updateStatus =
    async (
      id: string,
      status: EmployeeStatus
    ) => {
      setSavedMessage("");
      setErrorMessage("");

      try {
        await updateEmployeeStatus({
          id,
          status,
        }).unwrap();

        setSavedMessage(
          "Employee status updated successfully."
        );
      } catch (error) {
        setErrorMessage(
          getErrorMessage(
            error
          )
        );
      }
    };

  const refresh =
    async () => {
      setSavedMessage("");
      setErrorMessage("");

      await refetch();
    };

  const addPermission =
    async (
      permissionName: string
    ) => {
      try {
        const created =
          await createPermission({
            permissionName,
          }).unwrap();

        return {
          success: true,
          permission: created,
        };
      } catch (error) {
        setErrorMessage(
          getErrorMessage(
            error
          )
        );

        return {
          success: false,
        };
      }
    };

  return {
    employees,
    statusFilter,
    setStatusFilter: setStatus,
    employeeCounts,

    roles,
    permissions,

    lastEmployeeId,
    suggestedEmployeeId,

    query,
    setQuery,

    page,
    setPage,
    pageSize:
      PAGE_SIZE,
    totalEmployees,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,

    isLoading,

    isFetching:
      isFetching ||
      isRolesFetching ||
      isPermissionsFetching,

    isError,

    isCreating,
    isCreatingRole,
    isUpdatingStatus,
    isCreatingPermission,

    savedMessage,
    errorMessage,

    createEmployee:
      createEmployeeAccount,

    createPermission:
      addPermission,

    updateStatus,
    refresh,
  };
}

function getErrorMessage(
  error: unknown
): string {
  if (
    typeof error ===
    "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (
      error as {
        data?: unknown;
      }
    ).data;

    if (
      typeof data ===
      "string"
    ) {
      return data;
    }

    if (
      typeof data ===
      "object" &&
      data !== null &&
      "message" in data &&
      typeof (
        data as {
          message?: unknown;
        }
      ).message ===
      "string"
    ) {
      return (
        data as {
          message: string;
        }
      ).message;
    }

    if (
      typeof data ===
      "object" &&
      data !== null &&
      "details" in data &&
      typeof (
        data as {
          details?: unknown;
        }
      ).details ===
      "string"
    ) {
      return (
        data as {
          details: string;
        }
      ).details;
    }
  }

  return "Something went wrong. Please try again.";
}