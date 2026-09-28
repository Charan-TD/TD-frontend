import { baseApi } from "@/features/admin/api/baseApi";

import type {
  DbPermission,
  DbRole,
  DbRolePermission,
  PermissionMatrix,
} from "../models/employee";

export type Role = {
  id: string;
  name: string;
  description: string;

  /**
   * Permissions connected through role_permissions.
   */
  permissions: DbPermission[];

  /**
   * Convenience list of permission IDs.
   */
  permissionIds: string[];

  /**
   * Kept for compatibility with existing code.
   * The new permission source of truth is:
   *
   * roles
   *   ↓
   * role_permissions
   *   ↓
   * permissions
   */
  matrix: PermissionMatrix;

  persisted: boolean;
  memberCount: number;
};

export type CreateRoleInput = {
  name: string;
  description?: string;
  permissionIds: string[];
  permissionCode: PermissionMatrix;
};

function mapRole(
  role: DbRole,
  permissions: DbPermission[] = []
): Role {
  return {
    id: role.id,

    name: role.role_name,

    description: role.description ?? "",

    permissions,

    permissionIds: permissions.map(
      (permission) => permission.id
    ),

    /*
     * The old matrix is no longer the source of truth.
     *
     * Keep an empty matrix here for compatibility with
     * older components that may still expect this property.
     *
     * New components should use:
     * role.permissions
     * role.permissionIds
     */
    matrix: role.permission_code ?? {},

    persisted: true,

    memberCount: 0,
  };
}

export const rolesApi =
  baseApi.injectEndpoints({
    endpoints: (builder) => ({
      /*
       * --------------------------------------------------
       * GET PERMISSIONS
       * --------------------------------------------------
       *
       * Reads permissions dynamically from the database.
       */
      getPermissions:
        builder.query<
          DbPermission[],
          void
        >({
          query: () => ({
            url: "/permissions",

            params: {
              select:
                "id,permission_name,created_at",

              order:
                "permission_name.asc",
            },
          }),

          providesTags: (result) =>
            result
              ? [
                ...result.map(
                  (permission) => ({
                    type:
                      "Permission" as const,

                    id: permission.id,
                  })
                ),

                {
                  type:
                    "Permission" as const,

                  id: "LIST",
                },
              ]
              : [
                {
                  type:
                    "Permission" as const,

                  id: "LIST",
                },
              ],
        }),

      /*
       * --------------------------------------------------
       * CREATE PERMISSION
       * --------------------------------------------------
       *
       * Lets an admin add a permission that is not already
       * listed in the database (e.g. a missing operation for
       * a section, or an entirely custom permission name).
       */
      createPermission:
        builder.mutation<
          DbPermission,
          { permissionName: string }
        >({
          async queryFn(
            arg,
            _api,
            _extraOptions,
            baseQuery
          ) {
            const permissionName =
              arg.permissionName
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "_");

            if (!permissionName) {
              return {
                error: {
                  status: 400,

                  data:
                    "Permission name is required.",
                },
              };
            }

            const existingRes =
              await baseQuery({
                url: "/permissions",

                method: "GET",

                params: {
                  select:
                    "id,permission_name,created_at",

                  permission_name:
                    `eq.${permissionName}`,

                  limit: 1,
                },
              });

            if (existingRes.error) {
              return {
                error:
                  existingRes.error,
              };
            }

            const existing =
              (existingRes.data as DbPermission[]) ??
              [];

            if (existing[0]) {
              return {
                data: existing[0],
              };
            }

            const createRes =
              await baseQuery({
                url: "/permissions",

                method: "POST",

                headers: {
                  Prefer:
                    "return=representation",
                },

                body: {
                  permission_name:
                    permissionName,
                },
              });

            if (createRes.error) {
              return {
                error:
                  createRes.error,
              };
            }

            const created =
              (createRes.data as DbPermission[]) ??
              [];

            if (!created[0]) {
              return {
                error: {
                  status: 500,

                  data:
                    "Permission was created but the database did not return it.",
                },
              };
            }

            return {
              data: created[0],
            };
          },

          invalidatesTags: [
            {
              type:
                "Permission" as const,

              id: "LIST",
            },
          ],
        }),

      /*
       * --------------------------------------------------
       * GET ROLES
       * --------------------------------------------------
       *
       * Gets:
       *
       * 1. roles
       * 2. permissions
       * 3. role_permissions
       *
       * Then joins them on the frontend.
       */
      getRoles:
        builder.query<
          Role[],
          void
        >({
          async queryFn(
            _arg,
            _api,
            _extraOptions,
            baseQuery
          ) {
            /*
             * --------------------------------------------
             * 1. Get roles
             * --------------------------------------------
             */
            const rolesResponse =
              await baseQuery({
                url: "/roles",

                method: "GET",

                params: {
                  select:
                    "id,role_name,description,permission_code,created_at,updated_at",

                  order:
                    "role_name.asc",
                },
              });

            if (rolesResponse.error) {
              return {
                error:
                  rolesResponse.error,
              };
            }

            /*
             * --------------------------------------------
             * 2. Get permissions
             * --------------------------------------------
             */
            const permissionsResponse =
              await baseQuery({
                url: "/permissions",

                method: "GET",

                params: {
                  select:
                    "id,permission_name,created_at",

                  order:
                    "permission_name.asc",
                },
              });

            if (permissionsResponse.error) {
              return {
                error:
                  permissionsResponse.error,
              };
            }

            /*
             * --------------------------------------------
             * 3. Get role_permissions
             * --------------------------------------------
             */
            const rolePermissionsResponse =
              await baseQuery({
                url: "/role_permissions",

                method: "GET",

                params: {
                  select:
                    "id,role_id,permission_id",
                },
              });

            if (
              rolePermissionsResponse.error
            ) {
              return {
                error:
                  rolePermissionsResponse.error,
              };
            }

            const roles =
              (rolesResponse.data as DbRole[]) ??
              [];

            const permissions =
              (permissionsResponse.data as DbPermission[]) ??
              [];

            const rolePermissions =
              (rolePermissionsResponse.data as DbRolePermission[]) ??
              [];

            /*
             * --------------------------------------------
             * Create permission lookup map
             * --------------------------------------------
             *
             * permission.id
             *       ↓
             * DbPermission
             */
            const permissionMap =
              new Map<string, DbPermission>();

            permissions.forEach(
              (permission) => {
                permissionMap.set(
                  permission.id,
                  permission
                );
              }
            );

            /*
             * --------------------------------------------
             * Create role -> permissions map
             * --------------------------------------------
             */
            const rolePermissionMap =
              new Map<
                string,
                DbPermission[]
              >();

            rolePermissions.forEach(
              (rolePermission) => {
                const permission =
                  permissionMap.get(
                    rolePermission.permission_id
                  );

                if (!permission) {
                  return;
                }

                const existing =
                  rolePermissionMap.get(
                    rolePermission.role_id
                  ) ?? [];

                existing.push(permission);

                rolePermissionMap.set(
                  rolePermission.role_id,
                  existing
                );
              }
            );

            /*
             * --------------------------------------------
             * Build final Role objects
             * --------------------------------------------
             */
            const mappedRoles =
              roles.map((role) => {
                const rolePermissions =
                  rolePermissionMap.get(
                    role.id
                  ) ?? [];

                return mapRole(
                  role,
                  rolePermissions
                );
              });

            return {
              data: mappedRoles,
            };
          },

          providesTags: (result) =>
            result
              ? [
                ...result.map(
                  (role) => ({
                    type:
                      "Role" as const,

                    id: role.id,
                  })
                ),

                {
                  type:
                    "Role" as const,

                  id: "LIST",
                },
              ]
              : [
                {
                  type:
                    "Role" as const,

                  id: "LIST",
                },
              ],
        }),

      /*
       * --------------------------------------------------
       * CREATE ROLE
       * --------------------------------------------------
       *
       * Step 1:
       * Create row in roles.
       *
       * Step 2:
       * Create rows in role_permissions.
       *
       * We DO NOT write permission_id into roles anymore.
       */
      createRole:
        builder.mutation<
          Role,
          CreateRoleInput
        >({
          async queryFn(
            arg,
            _api,
            _extraOptions,
            baseQuery
          ) {
            const name =
              arg.name.trim();

            const description =
              arg.description?.trim() ?? "";

            /*
             * Validate role name.
             */
            if (!name) {
              return {
                error: {
                  status: 400,

                  data:
                    "Role name is required.",
                },
              };
            }

            /*
             * Remove duplicate permission IDs.
             */
            const permissionIds =
              Array.from(
                new Set(
                  (arg.permissionIds ?? [])
                    .filter(
                      (
                        permissionId
                      ): permissionId is string =>
                        Boolean(
                          permissionId
                        )
                    )
                )
              );

            /*
             * Require at least one permission.
             */
            if (
              permissionIds.length === 0
            ) {
              return {
                error: {
                  status: 400,

                  data:
                    "Please select at least one permission.",
                },
              };
            }

            /*
             * ------------------------------------------
             * STEP 1 — Create role
             * ------------------------------------------
             */
            const roleResponse =
              await baseQuery({
                url: "/roles",

                method: "POST",

                headers: {
                  Prefer:
                    "return=representation",
                },

                body: {
                  role_name: name,
                  description,
                  permission_code: arg.permissionCode,
                },
              });

            if (roleResponse.error) {
              return {
                error:
                  roleResponse.error,
              };
            }

            const createdRoles =
              (roleResponse.data as DbRole[]) ??
              [];

            const createdRole =
              createdRoles[0];

            if (!createdRole?.id) {
              return {
                error: {
                  status: 500,

                  data:
                    "Role was created but the database did not return the role ID.",
                },
              };
            }

            /*
             * ------------------------------------------
             * STEP 2 — Create role_permissions rows
             * ------------------------------------------
             */
            const rolePermissionRows =
              permissionIds.map(
                (permissionId) => ({
                  role_id:
                    createdRole.id,

                  permission_id:
                    permissionId,
                })
              );

            const rolePermissionsResponse =
              await baseQuery({
                url:
                  "/role_permissions",

                method: "POST",

                headers: {
                  Prefer:
                    "return=minimal",
                },

                body:
                  rolePermissionRows,
              });

            /*
             * If role_permissions insertion fails,
             * attempt to remove the newly created role.
             */
            if (
              rolePermissionsResponse.error
            ) {
              await baseQuery({
                url: "/roles",

                method: "DELETE",

                params: {
                  id:
                    `eq.${createdRole.id}`,
                },
              });

              return {
                error:
                  rolePermissionsResponse.error,
              };
            }

            /*
             * ------------------------------------------
             * Get permission details for returned Role
             * ------------------------------------------
             */
            const permissionsResponse =
              await baseQuery({
                url:
                  "/permissions",

                method: "GET",

                params: {
                  select:
                    "id,permission_name,created_at",

                  id:
                    `in.(${permissionIds.join(",")})`,
                },
              });

            if (
              permissionsResponse.error
            ) {
              /*
               * The role and role_permissions have already
               * been created successfully.
               *
               * We don't delete them here because the
               * database operation itself succeeded.
               */
              return {
                error:
                  permissionsResponse.error,
              };
            }

            const createdPermissions =
              (permissionsResponse.data as DbPermission[]) ??
              [];

            return {
              data:
                mapRole(
                  createdRole,
                  createdPermissions
                ),
            };
          },

          invalidatesTags: [
            "Role",
          ],
        }),
    }),
  });

export const {
  useGetRolesQuery,
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useCreatePermissionMutation,
} = rolesApi;