import { baseApi } from "@/features/admin/api/baseApi";

import type {
  DbEmployee,
  DbEmployeeRole,
  DbPermission,
  DbRole,
  DbRolePermission,
  Employee,
  EmployeeStatus,
} from "../models/employee";

import {
  grantedSections,
  normalizePermissionMatrix,
} from "../models/permissions";

export type CreateEmployeeInput = {
  empId: string;
  name: string;
  email: string;
  password: string;
  role: string;
  status?: EmployeeStatus;
};

type CreateEmployeeResponse = {
  employee: Employee;
};

type AssignEmployeeAccessInput = {
  employeeId: string;
  roleName: string;
};

type RoleAssignmentResponse = {
  success: boolean;
};

function normalizeStatus(
  status?: string | null
): EmployeeStatus {
  return status?.toLowerCase() ===
    "inactive"
    ? "Inactive"
    : "Active";
}

function formatCreatedDate(
  value?: string | null
): string {
  if (!value) {
    return "Recent";
  }

  return new Date(value).toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function mapEmployee(
  employee: DbEmployee,
  role?: DbRole,
  permissions: DbPermission[] = []
): Employee {
  const access =
    normalizePermissionMatrix(
      permissions
    );

  return {
    id: employee.id,
    empId: employee.emp_id,
    name: employee.name,
    email: employee.email,

    role:
      role?.role_name ??
      "Unassigned",

    roleId: role?.id,

    status:
      normalizeStatus(
        employee.status
      ),

    permissionIds:
      permissions.map(
        (permission) =>
          permission.id
      ),

    permissionNames:
      permissions.map(
        (permission) =>
          permission.permission_name
      ),

    permissions:
      grantedSections(access),

    access,

    createdAt:
      formatCreatedDate(
        employee.created_at
      ),

    hasPassword:
      Boolean(
        employee.password_hash
      ),

    profileImgUrl:
      employee.profile_img_url,
  };
}

async function loadRolePermissions(
  baseQuery: any
): Promise<
  | {
    data: {
      roles: DbRole[];
      permissions: DbPermission[];
      rolePermissions: DbRolePermission[];
    };
  }
  | {
    error: unknown;
  }
> {
  const rolesRes =
    await baseQuery({
      url: "/roles",
      method: "GET",
      params: {
        select:
          "id,role_name,description,permission_code,created_at,updated_at",
      },
    });

  if (rolesRes.error) {
    return {
      error:
        rolesRes.error,
    };
  }

  const permissionsRes =
    await baseQuery({
      url: "/permissions",
      method: "GET",
      params: {
        select:
          "id,permission_name,created_at",
      },
    });

  if (permissionsRes.error) {
    return {
      error:
        permissionsRes.error,
    };
  }

  const rolePermissionsRes =
    await baseQuery({
      url: "/role_permissions",
      method: "GET",
      params: {
        select:
          "id,role_id,permission_id",
      },
    });

  if (rolePermissionsRes.error) {
    return {
      error:
        rolePermissionsRes.error,
    };
  }

  return {
    data: {
      roles:
        (rolesRes.data as DbRole[]) ??
        [],

      permissions:
        (permissionsRes.data as DbPermission[]) ??
        [],

      rolePermissions:
        (rolePermissionsRes.data as DbRolePermission[]) ??
        [],
    },
  };
}

function getPermissionsForRole(
  roleId: string | undefined,
  rolePermissions: DbRolePermission[],
  permissions: DbPermission[]
): DbPermission[] {
  if (!roleId) {
    return [];
  }

  const permissionMap =
    new Map(
      permissions.map(
        (permission) => [
          permission.id,
          permission,
        ]
      )
    );

  return rolePermissions
    .filter(
      (item) =>
        item.role_id ===
        roleId
    )
    .map(
      (item) =>
        permissionMap.get(
          item.permission_id
        )
    )
    .filter(
      (
        permission
      ): permission is DbPermission =>
        Boolean(permission)
    );
}

export const adminUsersApi =
  baseApi.injectEndpoints({
    endpoints: (builder) => ({
      // ============================================================
      // GET EMPLOYEES
      // ============================================================

      getEmployees:
        builder.query<
          {
            employees: Employee[];
            total: number;
          },
          {
            limit: number;
            offset: number;
          }
        >({
          async queryFn(
            arg = {
              limit: 10,
              offset: 0,
            },
            _api,
            _extraOptions,
            baseQuery
          ) {
            const employeesRes =
              await baseQuery({
                url: "/employees",
                method: "GET",
                params: {
                  select:
                    "id,emp_id,name,email,status,created_at,updated_at,password_hash,profile_img_url",

                  order:
                    "created_at.desc",

                  limit:
                    arg.limit,

                  offset:
                    arg.offset,
                },

                headers: {
                  Prefer:
                    "count=exact",
                },
              });

            if (employeesRes.error) {
              return {
                error:
                  employeesRes.error,
              };
            }

            const employees =
              (employeesRes.data as DbEmployee[]) ??
              [];

            const contentRange =
              employeesRes.meta?.response?.headers.get(
                "content-range"
              );

            const total =
              contentRange
                ? Number(
                  contentRange.split("/")[1]
                )
                : employees.length;

            if (!employees.length) {
              return {
                data: {
                  employees: [],
                  total,
                },
              };
            }

            const assignmentsRes =
              await baseQuery({
                url: "/employee_roles",
                method: "GET",
                params: {
                  select:
                    "id,employee_id,role_id,status,created_at,updated_at",

                  status:
                    "eq.active",
                },
              });

            if (assignmentsRes.error) {
              return {
                error:
                  assignmentsRes.error,
              };
            }

            const assignments =
              (assignmentsRes.data as DbEmployeeRole[]) ??
              [];

            const relationResult =
              await loadRolePermissions(
                baseQuery
              );

            if (
              "error" in
              relationResult
            ) {
              return {
                error:
                  relationResult.error as any,
              };
            }

            const {
              roles,
              permissions,
              rolePermissions,
            } =
              relationResult.data;

            const roleMap =
              new Map(
                roles.map(
                  (role) => [
                    role.id,
                    role,
                  ]
                )
              );

            const assignmentMap =
              new Map<
                string,
                DbEmployeeRole
              >();

            assignments.forEach(
              (assignment) => {
                assignmentMap.set(
                  assignment.employee_id,
                  assignment
                );
              }
            );

            return {
              data: {
                employees:
                  employees.map(
                    (employee) => {
                      const assignment =
                        assignmentMap.get(
                          employee.id
                        );

                      const role =
                        assignment
                          ? roleMap.get(
                            assignment.role_id
                          )
                          : undefined;

                      const employeePermissions =
                        getPermissionsForRole(
                          role?.id,
                          rolePermissions,
                          permissions
                        );

                      return mapEmployee(
                        employee,
                        role,
                        employeePermissions
                      );
                    }
                  ),

                total,
              },
            };
          },

          providesTags: (
            result
          ) =>
            result
              ? [
                ...result.employees.map(
                  (employee) => ({
                    type:
                      "Employee" as const,

                    id:
                      employee.id,
                  })
                ),

                {
                  type:
                    "Employee" as const,

                  id:
                    "LIST",
                },
              ]
              : [
                {
                  type:
                    "Employee" as const,

                  id:
                    "LIST",
                },
              ],
        }),

      // ============================================================
      // GET LAST EMPLOYEE ID
      // ============================================================

      getLastEmployeeId:
        builder.query<
          string | null,
          void
        >({
          query: () => ({
            url: "/employees",

            params: {
              select: "emp_id",

              order:
                "created_at.desc",

              limit: 1,
            },
          }),

          transformResponse: (
            response: DbEmployee[]
          ) =>
            response?.[0]?.emp_id ??
            null,
        }),

      // ============================================================
      // CREATE EMPLOYEE
      // ============================================================

      createEmployee:
        builder.mutation<
          CreateEmployeeResponse,
          CreateEmployeeInput
        >({
          async queryFn(
            arg,
            _api,
            _extraOptions,
            baseQuery
          ) {
            const employeeId =
              arg.empId.trim();

            const roleName =
              arg.role.trim();

            if (!employeeId) {
              return {
                error: {
                  status: 400,

                  data:
                    "Employee ID is required.",
                },
              };
            }

            if (!roleName) {
              return {
                error: {
                  status: 400,

                  data:
                    "Role is required.",
                },
              };
            }

            const existingEmployeeRes =
              await baseQuery({
                url: "/employees",

                method: "GET",

                params: {
                  select:
                    "id,emp_id",

                  emp_id:
                    `eq.${employeeId}`,

                  limit: 1,
                },
              });

            if (
              existingEmployeeRes.error
            ) {
              return {
                error:
                  existingEmployeeRes.error,
              };
            }

            const existingEmployees =
              (existingEmployeeRes.data as DbEmployee[]) ??
              [];

            if (
              existingEmployees.length >
              0
            ) {
              return {
                error: {
                  status: 409,

                  data:
                    `Employee ID "${employeeId}" already exists. Please enter a different Employee ID.`,
                },
              };
            }

            // ------------------------------------------------------
            // FIND ROLE
            // ------------------------------------------------------

            const roleRes =
              await baseQuery({
                url: "/roles",

                method: "GET",

                params: {
                  select:
                    "id,role_name,description,permission_code,created_at,updated_at",

                  role_name:
                    `eq.${roleName}`,

                  limit: 1,
                },
              });

            if (roleRes.error) {
              return {
                error:
                  roleRes.error,
              };
            }

            const roles =
              (roleRes.data as DbRole[]) ??
              [];

            const role =
              roles[0];

            if (!role) {
              return {
                error: {
                  status: 404,

                  data:
                    `Role "${roleName}" was not found.`,
                },
              };
            }

            // ------------------------------------------------------
            // CREATE EMPLOYEE
            // ------------------------------------------------------

            const employeeRes =
              await baseQuery({
                url: "/employees",

                method: "POST",

                headers: {
                  Prefer:
                    "return=representation",
                },

                body: {
                  emp_id:
                    employeeId,

                  name:
                    arg.name.trim(),

                  email:
                    arg.email.trim(),

                  password_hash:
                    arg.password,

                  status:
                    arg.status ===
                      "Inactive"
                      ? "inactive"
                      : "active",
                },
              });

            if (
              employeeRes.error
            ) {
              const error =
                employeeRes.error;

              if (
                isDuplicateEmployeeIdError(
                  error
                )
              ) {
                return {
                  error: {
                    status: 409,

                    data:
                      `Employee ID "${employeeId}" already exists. Please enter a different Employee ID.`,
                  },
                };
              }

              return {
                error,
              };
            }

            const employees =
              (employeeRes.data as DbEmployee[]) ??
              [];

            const employee =
              employees[0];

            if (!employee?.id) {
              return {
                error: {
                  status: 500,

                  data:
                    "Employee was created but was not returned by the database.",
                },
              };
            }

            // ------------------------------------------------------
            // ASSIGN ROLE
            // ------------------------------------------------------

            const assignmentRes =
              await baseQuery({
                url: "/employee_roles",

                method: "POST",

                headers: {
                  Prefer:
                    "return=minimal",
                },

                body: {
                  employee_id:
                    employee.id,

                  role_id:
                    role.id,

                  status:
                    "active",
                },
              });

            if (
              assignmentRes.error
            ) {
              return {
                error:
                  assignmentRes.error,
              };
            }

            const relationResult =
              await loadRolePermissions(
                baseQuery
              );

            if (
              "error" in
              relationResult
            ) {
              return {
                error:
                  relationResult.error as any,
              };
            }

            const employeePermissions =
              getPermissionsForRole(
                role.id,

                relationResult.data
                  .rolePermissions,

                relationResult.data
                  .permissions
              );

            return {
              data: {
                employee:
                  mapEmployee(
                    employee,
                    role,
                    employeePermissions
                  ),
              },
            };
          },

          invalidatesTags: [
            {
              type:
                "Employee",

              id:
                "LIST",
            },

            {
              type:
                "Role",

              id:
                "LIST",
            },
          ],
        }),

      // ============================================================
      // ASSIGN EXISTING ROLE
      // ============================================================

      assignEmployeeAccess:
        builder.mutation<
          RoleAssignmentResponse,
          AssignEmployeeAccessInput
        >({
          async queryFn(
            arg,
            _api,
            _extraOptions,
            baseQuery
          ) {
            const roleRes =
              await baseQuery({
                url: "/roles",

                method: "GET",

                params: {
                  select:
                    "id,role_name",

                  role_name:
                    `eq.${arg.roleName}`,

                  limit: 1,
                },
              });

            if (roleRes.error) {
              return {
                error:
                  roleRes.error,
              };
            }

            const roles =
              (roleRes.data as DbRole[]) ??
              [];

            const role =
              roles[0];

            if (!role) {
              return {
                error: {
                  status: 404,

                  data:
                    `Role "${arg.roleName}" was not found.`,
                },
              };
            }

            const existingRes =
              await baseQuery({
                url: "/employee_roles",

                method: "GET",

                params: {
                  select:
                    "id,employee_id,role_id,status",

                  employee_id:
                    `eq.${arg.employeeId}`,

                  limit: 1,
                },
              });

            if (
              existingRes.error
            ) {
              return {
                error:
                  existingRes.error,
              };
            }

            const assignments =
              (existingRes.data as DbEmployeeRole[]) ??
              [];

            const existing =
              assignments[0];

            if (existing) {
              const updateRes =
                await baseQuery({
                  url: "/employee_roles",

                  method: "PATCH",

                  params: {
                    id:
                      `eq.${existing.id}`,
                  },

                  headers: {
                    Prefer:
                      "return=minimal",
                  },

                  body: {
                    role_id:
                      role.id,

                    status:
                      "active",
                  },
                });

              if (
                updateRes.error
              ) {
                return {
                  error:
                    updateRes.error,
                };
              }
            } else {
              const createRes =
                await baseQuery({
                  url: "/employee_roles",

                  method: "POST",

                  headers: {
                    Prefer:
                      "return=minimal",
                  },

                  body: {
                    employee_id:
                      arg.employeeId,

                    role_id:
                      role.id,

                    status:
                      "active",
                  },
                });

              if (
                createRes.error
              ) {
                return {
                  error:
                    createRes.error,
                };
              }
            }

            return {
              data: {
                success: true,
              },
            };
          },

          invalidatesTags: (
            _result,
            _error,
            { employeeId }
          ) => [
              {
                type:
                  "Employee",

                id:
                  employeeId,
              },

              {
                type:
                  "Employee",

                id:
                  "LIST",
              },
            ],
        }),

      // ============================================================
      // UPDATE EMPLOYEE STATUS
      // ============================================================

      updateEmployeeStatus:
        builder.mutation<
          Employee,
          {
            id: string;
            status: EmployeeStatus;
          }
        >({
          async queryFn(
            arg,
            _api,
            _extraOptions,
            baseQuery
          ) {
            const nextStatus =
              arg.status ===
                "Inactive"
                ? "inactive"
                : "active";

            const employeeRes =
              await baseQuery({
                url: "/employees",

                method: "PATCH",

                params: {
                  id:
                    `eq.${arg.id}`,
                },

                headers: {
                  Prefer:
                    "return=representation",
                },

                body: {
                  status:
                    nextStatus,
                },
              });

            if (
              employeeRes.error
            ) {
              return {
                error:
                  employeeRes.error,
              };
            }

            const assignmentRes =
              await baseQuery({
                url: "/employee_roles",

                method: "PATCH",

                params: {
                  employee_id:
                    `eq.${arg.id}`,
                },

                headers: {
                  Prefer:
                    "return=minimal",
                },

                body: {
                  status:
                    nextStatus,
                },
              });

            if (
              assignmentRes.error
            ) {
              return {
                error:
                  assignmentRes.error,
              };
            }

            const employees =
              (employeeRes.data as DbEmployee[]) ??
              [];

            const updated =
              employees[0];

            if (!updated) {
              return {
                error: {
                  status: 500,

                  data:
                    "Employee status was updated but the employee was not returned.",
                },
              };
            }

            return {
              data:
                mapEmployee(
                  updated
                ),
            };
          },

          invalidatesTags: (
            _result,
            _error,
            { id }
          ) => [
              {
                type:
                  "Employee",

                id,
              },

              {
                type:
                  "Employee",

                id:
                  "LIST",
              },
            ],
        }),
    }),
  });

function isDuplicateEmployeeIdError(
  error: unknown
): boolean {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false;
  }

  if (!("data" in error)) {
    return false;
  }

  const data = (
    error as {
      data?: unknown;
    }
  ).data;

  if (
    typeof data !== "object" ||
    data === null
  ) {
    return false;
  }

  const record =
    data as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };

  if (
    record.code === "23505"
  ) {
    return true;
  }

  const message =
    typeof record.message ===
      "string"
      ? record.message
      : "";

  const details =
    typeof record.details ===
      "string"
      ? record.details
      : "";

  return (
    message.includes(
      "employees_emp_id_key"
    ) ||
    details.includes(
      "employees_emp_id_key"
    )
  );
}

export const {
  useGetEmployeesQuery,
  useGetLastEmployeeIdQuery,
  useCreateEmployeeMutation,
  useAssignEmployeeAccessMutation,
  useUpdateEmployeeStatusMutation,
} = adminUsersApi;