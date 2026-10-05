import { baseApi } from "@/features/admin/api/baseApi";
import type { Pagination } from "@/features/admin/api/apiTypes";
import type { DbPermission, DbRole, PermissionMatrix } from "../models/employee";

export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: DbPermission[];
  permissionIds: string[];
  matrix: PermissionMatrix;
  persisted: boolean;
  memberCount: number;
};

export type RolePermissionInput = {
  permissionId: string;
  actions: Array<"read" | "insert" | "update" | "delete">;
};

export type CreateRoleInput = {
  name: string;
  description?: string;
  permissions: RolePermissionInput[];
};

type PermissionList = { permissions: DbPermission[]; pagination: Pagination };

function mapRole(role: DbRole & { permissions?: Array<{ permission_id: string; permission_name: string }> }): Role {
  const permissions: DbPermission[] = (role.permissions ?? []).map((permission) => ({
    id: permission.permission_id,
    permission_name: permission.permission_name,
  }));

  return {
    id: role.id,
    name: role.role_name,
    description: role.description ?? "",
    permissions,
    permissionIds: permissions.map((permission) => permission.id),
    matrix: role.permission_code ?? {},
    persisted: true,
    memberCount: 0,
  };
}

export const rolesApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getRoles: builder.query<Role[], void>({
      query: () => ({ url: "/roles", method: "GET" }),
      transformResponse: (response: { success: boolean; data: Array<DbRole & { permissions?: Array<{ permission_id: string; permission_name: string }> }> }) =>
        (response.data ?? []).map(mapRole),
      providesTags: (result) =>
        result
          ? [...result.map((role) => ({ type: "Role" as const, id: role.id })), { type: "Role" as const, id: "LIST" }]
          : [{ type: "Role" as const, id: "LIST" }],
    }),

    getPermissions: builder.query<DbPermission[], void>({
      query: () => ({ url: "/permissions", method: "GET", params: { page: 1, limit: 100 } }),
      transformResponse: (response: { success: boolean; data: PermissionList }) => response.data?.permissions ?? [],
      providesTags: (result) =>
        result
          ? [...result.map((permission) => ({ type: "Permission" as const, id: permission.id })), { type: "Permission" as const, id: "LIST" }]
          : [{ type: "Permission" as const, id: "LIST" }],
    }),

    createPermission: builder.mutation<DbPermission, { permissionName: string }>({
      query: ({ permissionName }) => ({
        url: "/permissions",
        method: "POST",
        body: { permissionName: permissionName.trim() },
      }),
      transformResponse: (response: { success: boolean; data: DbPermission }) => response.data,
      invalidatesTags: ["Permission", "Role"],
    }),

    createRole: builder.mutation<Role, CreateRoleInput>({
      query: ({ name, description, permissions }) => ({
        url: "/roles",
        method: "POST",
        body: {
          roleName: name.trim(),
          description: description?.trim() || null,
          permissions,
        },
      }),
      transformResponse: (response: { success: boolean; data: DbRole & { permissions?: Array<{ permission_id: string; permission_name: string }> } }) =>
        mapRole(response.data),
      invalidatesTags: ["Role", "Permission", "Employee"],
    }),

    updateRole: builder.mutation<Role, { id: string; name?: string; description?: string; permissions?: RolePermissionInput[] }>({
      query: ({ id, name, description, permissions }) => ({
        url: `/roles/${id}`,
        method: "PUT",
        body: {
          ...(name !== undefined ? { roleName: name.trim() } : {}),
          ...(description !== undefined ? { description: description.trim() || null } : {}),
          ...(permissions !== undefined ? { permissions } : {}),
        },
      }),
      transformResponse: (response: { success: boolean; data: DbRole & { permissions?: Array<{ permission_id: string; permission_name: string }> } }) =>
        mapRole(response.data),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
        "Employee",
      ],
    }),

    deleteRole: builder.mutation<unknown, { id: string }>({
      query: ({ id }) => ({
        url: `/roles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
        "Employee",
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useCreatePermissionMutation,
} = rolesApi;
