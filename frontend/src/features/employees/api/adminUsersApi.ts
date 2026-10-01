import { baseApi } from "@/features/admin/api/baseApi";
import type { Pagination } from "@/features/admin/api/apiTypes";
import type {
  DbEmployee,
  DbEmployeeRole,
  DbPermission,
  DbRole,
  Employee,
  EmployeeStatus,
} from "../models/employee";
import { grantedSections, normalizePermissionMatrix } from "../models/permissions";

export type CreateEmployeeInput = {
  empId: string;
  name: string;
  email: string;
  password: string;
  roleId: string;
  status?: EmployeeStatus;
};

type EmployeeListResponse = {
  employees: DbEmployee[];
  pagination: Pagination;
};

type EmployeeRoleListResponse = {
  employeeRoles: Array<DbEmployeeRole & { role_name?: string; employee_name?: string; emp_id?: string }>;
  pagination: Pagination;
};

type RoleListResponse = {
  roles: DbRole[];
};

type PermissionListResponse = {
  permissions: DbPermission[];
  pagination: Pagination;
};

function normalizeStatus(status?: string | null): EmployeeStatus {
  return status?.toLowerCase() === "inactive" ? "Inactive" : "Active";
}

function formatCreatedDate(value?: string | null): string {
  if (!value) return "Recent";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapEmployee(
  employee: DbEmployee,
  assignment?: EmployeeRoleListResponse["employeeRoles"][number],
  role?: DbRole & { permissions?: DbPermission[] },
): Employee {
  const permissions: DbPermission[] = role?.permissions ?? [];
  const access = normalizePermissionMatrix(permissions);

  return {
    id: employee.id,
    empId: employee.emp_id,
    name: employee.name,
    email: employee.email,
    role: assignment?.role_name ?? role?.role_name ?? "Unassigned",
    roleId: assignment?.role_id ?? role?.id,
    status: normalizeStatus(employee.status),
    permissionIds: permissions.map((permission) => permission.id),
    permissionNames: permissions.map((permission) => permission.permission_name),
    permissions: grantedSections(access),
    access,
    createdAt: formatCreatedDate(employee.created_at),
    hasPassword: Boolean(employee.password_hash),
    profileImgUrl: employee.profile_img_url,
  };
}

async function loadRoles(baseQuery: any): Promise<Array<DbRole & { permissions?: DbPermission[] }>> {
  const response = await baseQuery({ url: "/roles", method: "GET" });
  if (response.error) return [];
  const data = response.data as { success?: boolean; data?: Array<DbRole & { permissions?: Array<{ permission_id: string; permission_name: string }> }> };
  return (data?.data ?? []).map((role) => ({
    ...role,
    permissions: (role.permissions ?? []).map((permission) => ({
      id: permission.permission_id,
      permission_name: permission.permission_name,
    })),
  }));
}

async function loadEmployeeRoles(baseQuery: any): Promise<EmployeeRoleListResponse["employeeRoles"]> {
  const response = await baseQuery({
    url: "/employee-roles",
    method: "GET",
    params: { page: 1, limit: 100 },
  });
  if (response.error) return [];
  const data = response.data as { success?: boolean; data?: EmployeeRoleListResponse };
  return data?.data?.employeeRoles ?? [];
}

export const adminUsersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getEmployees: builder.query<
      { employees: Employee[]; total: number; pagination: Pagination },
      { page?: number; limit?: number }
    >({
      async queryFn(arg = {}, _api, _extraOptions, baseQuery) {
        const page = arg.page ?? 1;
        const limit = arg.limit ?? 10;

        const employeesResponse = await baseQuery({
          url: "/employees",
          method: "GET",
          params: { page, limit },
        });

        if (employeesResponse.error) return { error: employeesResponse.error };

        const payload = employeesResponse.data as { success: boolean; data: EmployeeListResponse };
        const employeeList = payload.data?.employees ?? [];
        const pagination = payload.data?.pagination ?? {
          page,
          limit,
          total: employeeList.length,
          totalPages: employeeList.length ? 1 : 0,
        };

        if (!employeeList.length) {
          return { data: { employees: [], total: pagination.total, pagination } };
        }

        const assignments = await loadEmployeeRoles(baseQuery);
        const roles = await loadRoles(baseQuery);
        const roleMap = new Map(roles.map((role) => [role.id, role]));
        const assignmentMap = new Map(assignments.map((assignment) => [assignment.employee_id, assignment]));

        return {
          data: {
            employees: employeeList.map((employee) => {
              const assignment = assignmentMap.get(employee.id);
              const role = assignment ? roleMap.get(assignment.role_id) : undefined;
              return mapEmployee(employee, assignment, role);
            }),
            total: pagination.total,
            pagination,
          },
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.employees.map((employee) => ({ type: "Employee" as const, id: employee.id })),
              { type: "Employee" as const, id: "LIST" },
            ]
          : [{ type: "Employee" as const, id: "LIST" }],
    }),

    getLastEmployeeId: builder.query<string | null, void>({
      query: () => ({ url: "/employees", method: "GET", params: { page: 1, limit: 1 } }),
      transformResponse: (response: { success: boolean; data: EmployeeListResponse }) =>
        response.data?.employees?.[0]?.emp_id ?? null,
    }),

    createEmployee: builder.mutation<{ employee: Employee }, CreateEmployeeInput>({
      async queryFn(arg, _api, _extraOptions, baseQuery) {
        const response = await baseQuery({
          url: "/employees",
          method: "POST",
          body: {
            name: arg.name.trim(),
            email: arg.email.trim(),
            empId: arg.empId.trim(),
            password: arg.password,
            status: arg.status === "Inactive" ? "inactive" : "active",
            roleId: arg.roleId,
          },
        });

        if (response.error) return { error: response.error };

        const payload = response.data as { success: boolean; data: DbEmployee };
        return { data: { employee: mapEmployee(payload.data) } };
      },
      invalidatesTags: ["Employee", "Role", "Permission"],
    }),

    updateEmployeeStatus: builder.mutation<DbEmployee, { id: string; status: EmployeeStatus }>({
      query: ({ id, status }) => ({
        url: `/employees/${id}`,
        method: "PATCH",
        body: { status: status === "Inactive" ? "inactive" : "active" },
      }),
      transformResponse: (response: { success: boolean; data: DbEmployee }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Employee", id },
        { type: "Employee", id: "LIST" },
      ],
    }),

    assignEmployeeAccess: builder.mutation<unknown, { employeeId: string; roleId: string; status?: "active" | "inactive" }>({
      query: ({ employeeId, roleId, status = "active" }) => ({
        url: "/employee-roles",
        method: "POST",
        body: { employeeId, roleId, status },
      }),
      invalidatesTags: ["Employee", "Role"],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useGetLastEmployeeIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeStatusMutation,
  useAssignEmployeeAccessMutation,
} = adminUsersApi;
