"use client";

import { useMemo, useState } from "react";

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

type CreateEmployeeFormInput = {
  empId: string;
  name: string;
  email: string;
  password: string;
  roleMode: "existing" | "new";
  roleName: string;
  roleDescription?: string;
  permissionIds?: string[];
  permissionCode?: PermissionMatrix;
};

const PAGE_SIZE = 8;

export function useEmployeesViewModel() {
  const [page, setPage] =
    useState(1);

  const {
    data: employeesData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetEmployeesQuery({
    limit: PAGE_SIZE,
    offset:
      (page - 1) *
      PAGE_SIZE,
  });

  const employees =
    employeesData?.employees ?? [];

  const totalEmployees =
    employeesData?.total ?? 0;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalEmployees /
        PAGE_SIZE
      )
    );

  const {
    data: roles = [],
    isFetching:
    isRolesFetching,
  } = useGetRolesQuery();

  const {
    data: permissions = [],
    isFetching:
    isPermissionsFetching,
  } = useGetPermissionsQuery();

  const {
    data: lastEmployeeId,
  } =
    useGetLastEmployeeIdQuery();

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

  const [query, setQuery] =
    useState("");

  const [
    savedMessage,
    setSavedMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const filteredEmployees =
    useMemo(() => {
      const value =
        query
          .trim()
          .toLowerCase();

      if (!value) {
        return employees;
      }

      return employees.filter(
        (employee) =>
          employee.name
            .toLowerCase()
            .includes(value) ||
          employee.email
            .toLowerCase()
            .includes(value) ||
          employee.empId
            .toLowerCase()
            .includes(value) ||
          employee.role
            .toLowerCase()
            .includes(value)
      );
    }, [
      employees,
      query,
    ]);

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
        let roleName =
          input.roleName.trim();

        if (
          input.roleMode ===
          "new"
        ) {
          if (
            !input.permissionIds?.length
          ) {
            setErrorMessage(
              "Select at least one permission for the new role."
            );

            return {
              success: false,
            };
          }

          const createdRole =
            await createRole({
              name: roleName,
              description:
                input.roleDescription ?? "",
              permissionIds:
                input.permissionIds,
              permissionCode:
                input.permissionCode ?? {},
            }).unwrap();

          roleName =
            createdRole.name;
        }

        await createEmployee({
          empId:
            employeeId,
          name:
            input.name.trim(),
          email:
            input.email.trim(),
          password:
            input.password,
          role:
            roleName,
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
    employees:
      filteredEmployees,

    roles,
    permissions,

    lastEmployeeId,

    query,
    setQuery,

    page,
    setPage,
    pageSize:
      PAGE_SIZE,
    totalEmployees,
    totalPages,

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