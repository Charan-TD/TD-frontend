import { baseApi } from "@/features/admin/api/baseApi";
import type { Pagination } from "@/features/admin/api/apiTypes";
import type {
  DbEmployee,
  DbEmployeeRole,
  DbPermission,
  DbRole,
  Employee,
  EmployeeRoleSummary,
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

type EmployeeAssignment = EmployeeRoleListResponse["employeeRoles"][number];
type RoleWithPermissions = DbRole & { permissions?: DbPermission[] };

function mapEmployee(
  employee: DbEmployee,
  assignments: EmployeeAssignment[] = [],
  roleMap: Map<string, RoleWithPermissions> = new Map(),
): Employee {
  const roles: EmployeeRoleSummary[] = assignments.map((assignment) => ({
    assignmentId: assignment.id,
    id: assignment.role_id,
    name: assignment.role_name ?? roleMap.get(assignment.role_id)?.role_name ?? "Unknown role",
    status: normalizeStatus(assignment.status),
  }));

  const activeRoles = roles.filter((role) => role.status === "Active");

  // Union of permissions from every active role, de-duplicated by id.
  const permissionById = new Map<string, DbPermission>();
  for (const assignment of assignments) {
    if (normalizeStatus(assignment.status) === "Inactive") continue;
    for (const permission of roleMap.get(assignment.role_id)?.permissions ?? []) {
      permissionById.set(permission.id, permission);
    }
  }
  const permissions = [...permissionById.values()];
  const access = normalizePermissionMatrix(permissions);

  return {
    id: employee.id,
    empId: employee.emp_id,
    name: employee.name,
    email: employee.email,
    // Removed (inactive) assignments stay in `roles` so they can be restored,
    // but only active ones count as the employee's current role.
    role: activeRoles.length ? activeRoles.map((role) => role.name).join(", ") : "Unassigned",
    roleId: activeRoles[0]?.id,
    roles,
    roleIds: roles.map((role) => role.id),
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

async function loadRoles(baseQuery: any): Promise<RoleWithPermissions[]> {
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

async function loadEmployeeRoles(baseQuery: any): Promise<EmployeeAssignment[]> {
  const limit = 100;
  const fetchPage = async (page: number) => {
    const response = await baseQuery({
      url: "/employee-roles",
      method: "GET",
      params: { page, limit },
    });
    if (response.error) return null;
    return (response.data as { success?: boolean; data?: EmployeeRoleListResponse })?.data ?? null;
  };

  // First page tells us how many pages exist; the rest are fetched in parallel
  // so employees beyond the first 100 assignments keep their roles.
  const first = await fetchPage(1);
  if (!first) return [];

  const totalPages = first.pagination?.totalPages ?? 1;
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => fetchPage(index + 2)),
  );

  return [first, ...rest].flatMap((page) => page?.employeeRoles ?? []);
}

function groupAssignmentsByEmployee(assignments: EmployeeAssignment[]): Map<string, EmployeeAssignment[]> {
  const grouped = new Map<string, EmployeeAssignment[]>();
  for (const assignment of assignments) {
    const list = grouped.get(assignment.employee_id);
    if (list) list.push(assignment);
    else grouped.set(assignment.employee_id, [assignment]);
  }
  return grouped;
}

/** The API's maximum page size; used when loading every employee. */
const ALL_EMPLOYEES_PAGE_SIZE = 100;

export const adminUsersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getEmployees: builder.query<
      { employees: Employee[]; total: number; pagination: Pagination },
      {
        page?: number;
        limit?: number;
        includeRoleMetadata?: boolean;
        /**
         * Load every employee (page by page, at the API's 100-per-page
         * maximum) so search can match people on any page. The API has
         * no search parameter of its own.
         */
        all?: boolean;
      }
    >({
      async queryFn(arg = {}, _api, _extraOptions, baseQuery) {
        const page = arg.all ? 1 : arg.page ?? 1;
        const limit = arg.all ? ALL_EMPLOYEES_PAGE_SIZE : arg.limit ?? 10;
        const includeRoleMetadata = arg.includeRoleMetadata ?? false;

        const fetchPage = (pageNumber: number) =>
          baseQuery({
            url: "/employees",
            method: "GET",
            params: { page: pageNumber, limit },
          });

        // Fetch employees and role metadata in parallel instead of one after another.
        const [employeesResponse, assignments, roles] = await Promise.all([
          fetchPage(page),
          includeRoleMetadata ? loadEmployeeRoles(baseQuery) : Promise.resolve([] as EmployeeAssignment[]),
          includeRoleMetadata ? loadRoles(baseQuery) : Promise.resolve([] as RoleWithPermissions[]),
        ]);

        if (employeesResponse.error) return { error: employeesResponse.error };

        const payload = employeesResponse.data as { success: boolean; data: EmployeeListResponse };
        let employeeList = payload.data?.employees ?? [];
        let pagination = payload.data?.pagination ?? {
          page,
          limit,
          total: employeeList.length,
          totalPages: employeeList.length ? 1 : 0,
        };

        if (arg.all && pagination.totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: pagination.totalPages - 1 }, (_, index) => fetchPage(index + 2)),
          );
          const failed = rest.find((response) => response.error);
          if (failed?.error) return { error: failed.error };

          employeeList = employeeList.concat(
            ...rest.map(
              (response) =>
                (response.data as { data?: EmployeeListResponse }).data?.employees ?? [],
            ),
          );
          pagination = { ...pagination, page: 1, limit: employeeList.length, totalPages: 1 };
        }

        if (!employeeList.length) {
          return { data: { employees: [], total: pagination.total, pagination } };
        }

        const roleMap = new Map(roles.map((role) => [role.id, role]));
        const assignmentsByEmployee = groupAssignmentsByEmployee(assignments);

        return {
          data: {
            employees: employeeList.map((employee) =>
              mapEmployee(employee, assignmentsByEmployee.get(employee.id), roleMap),
            ),
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
      providesTags: [{ type: "Employee", id: "LIST" }],
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
      // Flip the status in every cached employee list right away so the
      // table responds instantly; roll back if the request fails.
      async onQueryStarted({ id, status }, { dispatch, getState, queryFulfilled }) {
        const patches = adminUsersApi.util
          .selectInvalidatedBy(getState(), [{ type: "Employee", id }])
          .filter((entry) => entry.endpointName === "getEmployees")
          .map((entry) =>
            dispatch(
              adminUsersApi.util.updateQueryData("getEmployees", entry.originalArgs, (draft) => {
                const employee = draft.employees.find((item) => item.id === id);
                if (employee) employee.status = status;
              }),
            ),
          );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Employee", id },
        { type: "Employee", id: "LIST" },
      ],
    }),

    updateEmployee: builder.mutation<DbEmployee, { id: string; name?: string; email?: string }>({
      query: ({ id, name, email }) => ({
        url: `/employees/${id}`,
        method: "PATCH",
        body: {
          ...(name !== undefined ? { name: name.trim() } : {}),
          ...(email !== undefined ? { email: email.trim() } : {}),
        },
      }),
      transformResponse: (response: { success: boolean; data: DbEmployee }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Employee", id },
        { type: "Employee", id: "LIST" },
      ],
    }),

    removeEmployeeRole: builder.mutation<unknown, { assignmentId: string }>({
      query: ({ assignmentId }) => ({
        url: `/employee-roles/${assignmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employee", "Role"],
    }),

    /** Turns a removed (inactive) role assignment back on. */
    restoreEmployeeRole: builder.mutation<unknown, { assignmentId: string }>({
      query: ({ assignmentId }) => ({
        url: `/employee-roles/${assignmentId}`,
        method: "PATCH",
        body: { status: "active" },
      }),
      invalidatesTags: ["Employee", "Role"],
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
  useRestoreEmployeeRoleMutation,
  useGetEmployeesQuery,
  useGetLastEmployeeIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeStatusMutation,
  useUpdateEmployeeMutation,
  useRemoveEmployeeRoleMutation,
  useAssignEmployeeAccessMutation,
} = adminUsersApi;
