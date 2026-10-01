import pool from "../config/database.js";

/*
|--------------------------------------------------------------------------
| Get all roles
|--------------------------------------------------------------------------
*/
export const getRoles = async () => {
  const query = `
    SELECT
      id,
      role_name,
      description,
      permission_code,
      created_at,
      updated_at
    FROM roles
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query);
  return result.rows;
};


/*
|--------------------------------------------------------------------------
| Get role by ID
|--------------------------------------------------------------------------
*/
export const getRoleById = async (roleId) => {
  const query = `
    SELECT
      id,
      role_name,
      description,
      permission_code,
      created_at,
      updated_at
    FROM roles
    WHERE id = $1
  `;

  const result = await pool.query(query, [roleId]);
  return result.rows[0] || null;
};


/*
|--------------------------------------------------------------------------
| Find role by name
|--------------------------------------------------------------------------
*/
export const findRoleByName = async (roleName, excludeRoleId = null) => {
  const query = `
    SELECT
      id,
      role_name,
      description,
      permission_code,
      created_at,
      updated_at
    FROM roles
    WHERE LOWER(role_name) = LOWER($1)
      AND ($2::uuid IS NULL OR id <> $2)
    LIMIT 1
  `;

  const result = await pool.query(query, [roleName, excludeRoleId]);
  return result.rows[0] || null;
};


/*
|--------------------------------------------------------------------------
| Create role
|--------------------------------------------------------------------------
*/
export const createRole = async (
  client,
  { roleName, description, permissionCode }
) => {
  const query = `
    INSERT INTO roles (
      role_name,
      description,
      permission_code
    )
    VALUES ($1, $2, $3::jsonb)
    RETURNING
      id,
      role_name,
      description,
      permission_code,
      created_at,
      updated_at
  `;

  const result = await client.query(query, [
    roleName,
    description ?? null,
    JSON.stringify(permissionCode)
  ]);

  return result.rows[0];
};


/*
|--------------------------------------------------------------------------
| Update role
|--------------------------------------------------------------------------
*/
export const updateRole = async (
  client,
  roleId,
  { roleName, description, permissionCode }
) => {
  const query = `
    UPDATE roles
    SET
      role_name = COALESCE($1, role_name),
      description = COALESCE($2, description),
      permission_code = COALESCE($3::jsonb, permission_code),
      updated_at = NOW()
    WHERE id = $4
    RETURNING
      id,
      role_name,
      description,
      permission_code,
      created_at,
      updated_at
  `;

  const result = await client.query(query, [
    roleName ?? null,
    description ?? null,
    permissionCode
      ? JSON.stringify(permissionCode)
      : null,
    roleId
  ]);

  return result.rows[0] || null;
};


/*
|--------------------------------------------------------------------------
| Delete role permissions
|--------------------------------------------------------------------------
*/
export const deleteRolePermissions = async (client, roleId) => {
  await client.query(
    `
      DELETE FROM role_permissions
      WHERE role_id = $1
    `,
    [roleId]
  );
};


/*
|--------------------------------------------------------------------------
| Add role permissions
|--------------------------------------------------------------------------
*/
export const addRolePermissions = async (
  client,
  roleId,
  permissionIds
) => {
  if (!permissionIds || permissionIds.length === 0) {
    return;
  }

  const values = [];
  const placeholders = [];

  permissionIds.forEach((permissionId, index) => {
    const roleParam = index * 2 + 1;
    const permissionParam = index * 2 + 2;

    values.push(roleId, permissionId);

    placeholders.push(
      `($${roleParam}, $${permissionParam})`
    );
  });

  const query = `
    INSERT INTO role_permissions (
      role_id,
      permission_id
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (
      role_id,
      permission_id
    )
    DO NOTHING
  `;

  await client.query(query, values);
};


/*
|--------------------------------------------------------------------------
| Get permissions by IDs
|--------------------------------------------------------------------------
*/
export const getPermissionsByIds = async (
  client,
  permissionIds
) => {
  if (!permissionIds || permissionIds.length === 0) {
    return [];
  }

  const query = `
    SELECT
      id,
      permission_name,
      created_at
    FROM permissions
    WHERE id = ANY($1::uuid[])
    ORDER BY permission_name
  `;

  const result = await client.query(query, [permissionIds]);

  return result.rows;
};


/*
|--------------------------------------------------------------------------
| Get transaction client
|--------------------------------------------------------------------------
*/
export const getTransactionClient = async () => {
  const client = await pool.connect();

  await client.query("BEGIN");

  return client;
};


/*
|--------------------------------------------------------------------------
| Commit transaction
|--------------------------------------------------------------------------
*/
export const commitTransaction = async (client) => {
  await client.query("COMMIT");
  client.release();
};


/*
|--------------------------------------------------------------------------
| Rollback transaction
|--------------------------------------------------------------------------
*/
export const rollbackTransaction = async (client) => {
  try {
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }
};


/*
|--------------------------------------------------------------------------
| Get permissions for a role
|--------------------------------------------------------------------------
*/
export const getRolePermissions = async (roleId) => {
  const query = `
    SELECT
      p.id AS permission_id,
      p.permission_name
    FROM role_permissions rp
    INNER JOIN permissions p
      ON p.id = rp.permission_id
    WHERE rp.role_id = $1
    ORDER BY p.permission_name
  `;

  const result = await pool.query(query, [roleId]);

  return result.rows;
};