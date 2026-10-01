import {AppError} from "../utils/app-error.js";

import {
  getRoles,
  getRoleById,
  findRoleByName,
  createRole as createRoleRepository,
  updateRole as updateRoleRepository,
  deleteRolePermissions,
  addRolePermissions,
  getPermissionsByIds,
  getTransactionClient
} from "../repositories/role.repository.js";


/*
|--------------------------------------------------------------------------
| Prepare and validate permissions
|--------------------------------------------------------------------------
*/
const preparePermissions = async (client, permissions) => {
  if (!Array.isArray(permissions)) {
    throw new AppError("permissions must be an array", 400);
  }

  if (permissions.length === 0) {
    throw new AppError(
      "At least one permission is required",
      400
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate duplicate permission IDs
  |--------------------------------------------------------------------------
  */
  const permissionIds = permissions.map(
    (permission) => permission.permissionId
  );

  const uniquePermissionIds = [
    ...new Set(permissionIds)
  ];

  if (
    uniquePermissionIds.length !==
    permissionIds.length
  ) {
    throw new AppError(
      "Duplicate permission IDs are not allowed",
      400
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Get permission resources from DB
  |--------------------------------------------------------------------------
  */
  const permissionRows =
    await getPermissionsByIds(
      client,
      uniquePermissionIds
    );

  if (
    permissionRows.length !==
    uniquePermissionIds.length
  ) {
    const foundIds = new Set(
      permissionRows.map(
        (permission) => permission.id
      )
    );

    const missingIds =
      uniquePermissionIds.filter(
        (id) => !foundIds.has(id)
      );

    throw new AppError(
      `Permission IDs do not exist: ${missingIds.join(", ")}`,
      400
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Build permission_code
  |--------------------------------------------------------------------------
  */
  const permissionCode = {};

  for (const permission of permissions) {
    const permissionRow =
      permissionRows.find(
        (row) =>
          row.id === permission.permissionId
      );

    if (!permissionRow) {
      throw new AppError(
        `Permission not found: ${permission.permissionId}`,
        400
      );
    }

    const resource =
      permissionRow.permission_name;

    if (
      !resource ||
      typeof resource !== "string" ||
      resource.trim().length === 0
    ) {
      throw new AppError(
        `Invalid permission resource for ID: ${permission.permissionId}`,
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | permission_name must be resource only
    |--------------------------------------------------------------------------
    */
    if (resource.includes("_")) {
      throw new AppError(
        `Invalid permission resource '${resource}'. permission_name must contain only the resource name.`,
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Validate actions
    |--------------------------------------------------------------------------
    */
    if (!Array.isArray(permission.actions)) {
      throw new AppError(
        `Actions must be an array for '${resource}'`,
        400
      );
    }

    if (permission.actions.length === 0) {
      throw new AppError(
        `At least one action is required for '${resource}'`,
        400
      );
    }

    const allowedActions = [
      "read",
      "insert",
      "update",
      "delete"
    ];

    const invalidActions =
      permission.actions.filter(
        (action) =>
          !allowedActions.includes(action)
      );

    if (invalidActions.length > 0) {
      throw new AppError(
        `Invalid action(s) for '${resource}': ${invalidActions.join(", ")}`,
        400
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Remove duplicate actions
    |--------------------------------------------------------------------------
    */
    const uniqueActions = [
      ...new Set(permission.actions)
    ];

    permissionCode[resource] =
      uniqueActions;
  }

  return {
    permissionIds: uniquePermissionIds,
    permissionCode
  };
};


/*
|--------------------------------------------------------------------------
| Get all roles
|--------------------------------------------------------------------------
*/
export const getAllRoles = async () => {
  return await getRoles();
};


/*
|--------------------------------------------------------------------------
| Get role by ID
|--------------------------------------------------------------------------
*/
export const getRole = async (roleId) => {
  const role = await getRoleById(roleId);

  if (!role) {
    throw new AppError(
      "Role not found",
      404
    );
  }

  return role;
};


/*
|--------------------------------------------------------------------------
| Create role
|--------------------------------------------------------------------------
*/
export const createRole = async ({
  roleName,
  description,
  permissions
}) => {
  const existingRole =
    await findRoleByName(roleName);

  if (existingRole) {
    throw new AppError(
      "Role with this name already exists",
      409
    );
  }

  const client =
    await getTransactionClient();

  try {
    /*
    |--------------------------------------------------------------------------
    | Validate permissions and build permission_code
    |--------------------------------------------------------------------------
    */
    const {
      permissionIds,
      permissionCode
    } = await preparePermissions(
      client,
      permissions
    );

    /*
    |--------------------------------------------------------------------------
    | Create role
    |--------------------------------------------------------------------------
    */
    const role =
      await createRoleRepository(
        client,
        {
          roleName,
          description,
          permissionCode
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Add resource-level permissions
    |--------------------------------------------------------------------------
    */
    await addRolePermissions(
      client,
      role.id,
      permissionIds
    );

    await client.query("COMMIT");
    client.release();

    return role;

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    throw error;
  }
};


/*
|--------------------------------------------------------------------------
| Update role
|--------------------------------------------------------------------------
*/
export const updateRole = async (
  roleId,
  {
    roleName,
    description,
    permissions
  }
) => {
  const existingRole =
    await getRoleById(roleId);

  if (!existingRole) {
    throw new AppError(
      "Role not found",
      404
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Check duplicate role name
  |--------------------------------------------------------------------------
  */
  if (roleName) {
    const duplicateRole =
      await findRoleByName(
        roleName,
        roleId
      );

    if (duplicateRole) {
      throw new AppError(
        "Role with this name already exists",
        409
      );
    }
  }

  const client =
    await getTransactionClient();

  try {
    let permissionIds;
    let permissionCode;

    /*
    |--------------------------------------------------------------------------
    | Only update permissions when supplied
    |--------------------------------------------------------------------------
    */
    if (permissions !== undefined) {
      const prepared =
        await preparePermissions(
          client,
          permissions
        );

      permissionIds =
        prepared.permissionIds;

      permissionCode =
        prepared.permissionCode;
    }

    /*
    |--------------------------------------------------------------------------
    | Update role
    |--------------------------------------------------------------------------
    */
    const role =
      await updateRoleRepository(
        client,
        roleId,
        {
          roleName,
          description,
          permissionCode
        }
      );

    if (!role) {
      throw new AppError(
        "Role not found",
        404
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Replace resource-level permissions
    |--------------------------------------------------------------------------
    */
    if (permissions !== undefined) {
      await deleteRolePermissions(
        client,
        roleId
      );

      await addRolePermissions(
        client,
        roleId,
        permissionIds
      );
    }

    await client.query("COMMIT");
    client.release();

    return role;

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    throw error;
  }
};


/*
|--------------------------------------------------------------------------
| Delete role
|--------------------------------------------------------------------------
*/
export const deleteRole = async (roleId) => {
  const existingRole =
    await getRoleById(roleId);

  if (!existingRole) {
    throw new AppError(
      "Role not found",
      404
    );
  }

  const client =
    await getTransactionClient();

  try {
    /*
    |--------------------------------------------------------------------------
    | Delete role permissions first
    |--------------------------------------------------------------------------
    */
    await deleteRolePermissions(
      client,
      roleId
    );

    /*
    |--------------------------------------------------------------------------
    | Delete role
    |--------------------------------------------------------------------------
    */
    await client.query(
      `
        DELETE FROM roles
        WHERE id = $1
      `,
      [roleId]
    );

    await client.query("COMMIT");
    client.release();

    return {
      message: "Role deleted successfully"
    };

  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    throw error;
  }
};