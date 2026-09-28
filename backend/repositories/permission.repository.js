import pool from "../config/database.js";

// Get all permissions with pagination
export const getPermissions = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM permissions
  `;

  const dataQuery = `
    SELECT
      id,
      permission_name,
      created_at
    FROM permissions
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery),
    pool.query(dataQuery, [limit, offset])
  ]);

  return {
    total: countResult.rows[0].total,
    permissions: dataResult.rows
  };
};


// Find permission by ID
export const findPermissionById = async (id) => {
  const query = `
    SELECT
      id,
      permission_name,
      created_at
    FROM permissions
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};


// Check duplicate permission name
export const permissionNameExists = async (
  permissionName,
  excludeId = null
) => {
  const query = `
    SELECT id
    FROM permissions
    WHERE LOWER(permission_name) = LOWER($1)
      AND ($2::uuid IS NULL OR id <> $2)
    LIMIT 1
  `;

  const result = await pool.query(query, [
    permissionName,
    excludeId
  ]);

  return result.rows.length > 0;
};


// Create permission
export const createPermission = async (permissionName) => {
  const query = `
    INSERT INTO permissions (
      permission_name
    )
    VALUES ($1)
    RETURNING
      id,
      permission_name,
      created_at
  `;

  const result = await pool.query(query, [
    permissionName
  ]);

  return result.rows[0];
};


// Update permission
export const updatePermission = async ({
  id,
  permissionName
}) => {
  const query = `
    UPDATE permissions
    SET permission_name = $1
    WHERE id = $2
    RETURNING
      id,
      permission_name,
      created_at
  `;

  const result = await pool.query(query, [
    permissionName,
    id
  ]);

  return result.rows[0] || null;
};


// Delete permission
export const deletePermission = async (id) => {
  const query = `
    DELETE FROM permissions
    WHERE id = $1
    RETURNING
      id,
      permission_name,
      created_at
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};