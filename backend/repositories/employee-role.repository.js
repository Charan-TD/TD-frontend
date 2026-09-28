import pool from "../config/database.js";

// Get employee roles with employee and role details
export const getEmployeeRoles = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM employee_roles
  `;

  const dataQuery = `
    SELECT
      er.id,
      er.employee_id,
      e.emp_id,
      e.name AS employee_name,
      er.role_id,
      r.role_name,
      er.status,
      er.created_at,
      er.updated_at
    FROM employee_roles er
    INNER JOIN employees e
      ON e.id = er.employee_id
    INNER JOIN roles r
      ON r.id = er.role_id
    ORDER BY er.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery),
    pool.query(dataQuery, [limit, offset])
  ]);

  return {
    total: countResult.rows[0].total,
    employeeRoles: dataResult.rows
  };
};


// Get one employee-role assignment
export const findEmployeeRoleById = async (id) => {
  const query = `
    SELECT
      er.id,
      er.employee_id,
      e.emp_id,
      e.name AS employee_name,
      er.role_id,
      r.role_name,
      er.status,
      er.created_at,
      er.updated_at
    FROM employee_roles er
    INNER JOIN employees e
      ON e.id = er.employee_id
    INNER JOIN roles r
      ON r.id = er.role_id
    WHERE er.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};


// Check whether employee exists
export const employeeExists = async (employeeId) => {
  const result = await pool.query(
    `
    SELECT id
    FROM employees
    WHERE id = $1
    LIMIT 1
    `,
    [employeeId]
  );

  return result.rows.length > 0;
};


// Check whether role exists
export const roleExists = async (roleId) => {
  const result = await pool.query(
    `
    SELECT id
    FROM roles
    WHERE id = $1
    LIMIT 1
    `,
    [roleId]
  );

  return result.rows.length > 0;
};


// Check duplicate employee-role assignment
export const employeeRoleExists = async ({
  employeeId,
  roleId,
  excludeId = null
}) => {
  const query = `
    SELECT id
    FROM employee_roles
    WHERE employee_id = $1
      AND role_id = $2
      AND status = 'active'
      AND ($3::uuid IS NULL OR id <> $3)
    LIMIT 1
  `;

  const result = await pool.query(query, [
    employeeId,
    roleId,
    excludeId
  ]);

  return result.rows.length > 0;
};


// Create employee-role assignment
export const createEmployeeRole = async ({
  employeeId,
  roleId,
  status = "active"
}) => {
  const query = `
    INSERT INTO employee_roles (
      employee_id,
      role_id,
      status
    )
    VALUES ($1, $2, $3)
    RETURNING
      id,
      employee_id,
      role_id,
      status,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [
    employeeId,
    roleId,
    status
  ]);

  return result.rows[0];
};


// Update employee-role assignment
export const updateEmployeeRole = async ({
  id,
  employeeId,
  roleId,
  status
}) => {
  const fields = [];
  const values = [];
  let index = 1;

  if (employeeId !== undefined) {
    fields.push(`employee_id = $${index++}`);
    values.push(employeeId);
  }

  if (roleId !== undefined) {
    fields.push(`role_id = $${index++}`);
    values.push(roleId);
  }

  if (status !== undefined) {
    fields.push(`status = $${index++}`);
    values.push(status);
  }

  fields.push(`updated_at = now()`);

  values.push(id);

  const query = `
    UPDATE employee_roles
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING
      id,
      employee_id,
      role_id,
      status,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};


// Deactivate employee-role assignment
export const deactivateEmployeeRole = async (id) => {
  const query = `
    UPDATE employee_roles
    SET
      status = 'inactive',
      updated_at = now()
    WHERE id = $1
    RETURNING
      id,
      employee_id,
      role_id,
      status,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};