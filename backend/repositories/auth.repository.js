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

// Get employee role and permissions
export const getEmployeeAuthorization = async (employeeId) => {
  const query = `
    SELECT
      er.employee_id,
      r.id AS role_id,
      r.role_name,
      p.id AS permission_id,
      p.permission_name
    FROM employee_roles er
    INNER JOIN roles r
      ON r.id = er.role_id
    INNER JOIN role_permissions rp
      ON rp.role_id = r.id
    INNER JOIN permissions p
      ON p.id = rp.permission_id
    WHERE er.employee_id = $1
      AND er.status = 'active'
    ORDER BY p.permission_name
  `;

  const result = await pool.query(query, [employeeId]);

  return result.rows;
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