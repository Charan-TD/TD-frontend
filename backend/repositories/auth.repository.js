import pool from "../config/database.js";

// Find employee by email
export const findEmployeeByEmail = async (email) => {
  const query = `
    SELECT
      e.id,
      e.name,
      e.email,
      e.emp_id,
      e.password_hash,
      e.status,
      e.profile_img_url,
      e.token_version
    FROM employees e
    WHERE e.email = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0] || null;
};


// Find employee by ID
// Find employee by ID
export const findEmployeeById = async (employeeId) => {
  const query = `
    SELECT
      e.id,
      e.name,
      e.email,
      e.emp_id,
      e.status,
      e.profile_img_url,
      e.token_version
    FROM employees e
    WHERE e.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [employeeId]);

  return result.rows[0] || null;
};

const ACTION_ORDER = ["read", "insert", "update", "delete"];

// Union of every role's permission_code, e.g.
// { users: ["read"] } + { users: ["update"], orders: ["read"] }
//   -> { users: ["read", "update"], orders: ["read"] }
const mergePermissionCodes = (permissionCodes) => {
  const merged = {};

  for (const permissionCode of permissionCodes) {
    for (const [resource, actions] of Object.entries(permissionCode || {})) {
      if (!Array.isArray(actions)) continue;
      merged[resource] = [...new Set([...(merged[resource] || []), ...actions])];
    }
  }

  for (const resource of Object.keys(merged)) {
    merged[resource].sort(
      (a, b) =>
        (ACTION_ORDER.indexOf(a) + 1 || 99) - (ACTION_ORDER.indexOf(b) + 1 || 99)
    );
  }

  return merged;
};

// Get employee role and permissions.
// An employee can hold several active roles; their access is the
// combination of all of them. role_id is the earliest assigned role (kept
// for tokens), role_name lists every role, and roles has each one.
export const getEmployeeAuthorization = async (employeeId) => {
  const query = `
    SELECT
      er.employee_id,
      r.id AS role_id,
      r.role_name,
      r.permission_code
    FROM employee_roles er
    INNER JOIN roles r
      ON r.id = er.role_id
    WHERE er.employee_id = $1
      AND er.status = 'active'
    ORDER BY er.created_at ASC, r.id ASC
  `;

  const result = await pool.query(query, [employeeId]);

  if (result.rows.length === 0) {
    return null;
  }

  const [primary] = result.rows;

  return {
    employee_id: primary.employee_id,
    role_id: primary.role_id,
    role_name: result.rows.map((row) => row.role_name).join(", "),
    permission_code: mergePermissionCodes(
      result.rows.map((row) => row.permission_code)
    ),
    roles: result.rows.map((row) => ({
      id: row.role_id,
      name: row.role_name
    }))
  };
};

// Update employee password hash
export const updateEmployeePasswordHash = async (
  employeeId,
  passwordHash
) => {
  const query = `
    UPDATE employees
    SET
      password_hash = $1,
      updated_at = now()
    WHERE id = $2
  `;

  await pool.query(query, [passwordHash, employeeId]);
};

// Get employee password hash
export const getEmployeePasswordHash = async (
  employeeId
) => {
  const query = `
    SELECT
      id,
      password_hash,
      status
    FROM employees
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [
    employeeId
  ]);

  return result.rows[0] || null;
};

// Update employee password
export const updateEmployeePassword = async (
  employeeId,
  passwordHash
) => {
  const query = `
    UPDATE employees
    SET
      password_hash = $1,
      token_version = token_version + 1,
      updated_at = now()
    WHERE id = $2
    RETURNING
      id,
      email,
      token_version,
      updated_at
  `;

  const result = await pool.query(query, [
    passwordHash,
    employeeId
  ]);

  return result.rows[0] || null;
};