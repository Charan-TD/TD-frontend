import pool from "../config/database.js";

export const getEmployees = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM employees
  `;

  const dataQuery = `
    SELECT
      id,
      emp_id,
      name,
      email,
      status,
      profile_img_url,
      created_at,
      updated_at
    FROM employees
    ORDER BY created_at DESC
    LIMIT $1
    OFFSET $2
  `;

  const [countResult, dataResult] = await Promise.all([
    pool.query(countQuery),
    pool.query(dataQuery, [limit, offset])
  ]);

  return {
    employees: dataResult.rows,
    total: countResult.rows[0].total
  };
};

export const createEmployeeWithRole = async ({
  name,
  email,
  empId,
  passwordHash,
  status = "active",
  profileImgUrl = null,
  roleId
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const roleResult = await client.query(
      `
        SELECT
          id,
          role_name
        FROM roles
        WHERE id = $1
        LIMIT 1
      `,
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      const error = new Error("Role not found");
      error.statusCode = 400;
      error.isOperational = true;
      throw error;
    }

    const employeeResult = await client.query(
      `
        INSERT INTO employees (
          name,
          email,
          emp_id,
          password_hash,
          status,
          profile_img_url
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          name,
          email,
          emp_id,
          status,
          profile_img_url,
          created_at,
          updated_at
      `,
      [
        name,
        email,
        empId,
        passwordHash,
        status,
        profileImgUrl
      ]
    );

    const employee = employeeResult.rows[0];

    const roleAssignmentResult = await client.query(
      `
        INSERT INTO employee_roles (
          employee_id,
          role_id,
          status
        )
        VALUES ($1, $2, 'active')
        RETURNING
          id,
          employee_id,
          role_id,
          status,
          created_at,
          updated_at
      `,
      [employee.id, roleId]
    );

    await client.query("COMMIT");

    return {
      employee,
      role: {
        id: roleResult.rows[0].id,
        role_name: roleResult.rows[0].role_name
      },
      roleAssignment: roleAssignmentResult.rows[0]
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateEmployeeWithRole = async ({
  employeeId,
  name,
  email,
  empId,
  passwordHash,
  status,
  profileImgUrl,
  roleId
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check employee exists
    const employeeCheck = await client.query(
      `
        SELECT id
        FROM employees
        WHERE id = $1
        LIMIT 1
      `,
      [employeeId]
    );

    if (employeeCheck.rows.length === 0) {
      const error = new Error("Employee not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    // Check role if a new role was supplied
    let role = null;

    if (roleId !== undefined) {
      const roleResult = await client.query(
        `
          SELECT
            id,
            role_name
          FROM roles
          WHERE id = $1
          LIMIT 1
        `,
        [roleId]
      );

      if (roleResult.rows.length === 0) {
        const error = new Error("Role not found");
        error.statusCode = 400;
        error.isOperational = true;
        throw error;
      }

      role = roleResult.rows[0];
    }

    // Build employee update dynamically
    const fields = [];
    const values = [];
    let parameterIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${parameterIndex++}`);
      values.push(name);
    }

    if (email !== undefined) {
      fields.push(`email = $${parameterIndex++}`);
      values.push(email);
    }

    if (empId !== undefined) {
      fields.push(`emp_id = $${parameterIndex++}`);
      values.push(empId);
    }

    if (passwordHash !== undefined) {
      fields.push(`password_hash = $${parameterIndex++}`);
      values.push(passwordHash);
    }

    if (status !== undefined) {
      fields.push(`status = $${parameterIndex++}`);
      values.push(status);
    }

    if (profileImgUrl !== undefined) {
      fields.push(`profile_img_url = $${parameterIndex++}`);
      values.push(profileImgUrl);
    }

    fields.push(`updated_at = NOW()`);

    values.push(employeeId);

    const employeeResult = await client.query(
      `
        UPDATE employees
        SET ${fields.join(", ")}
        WHERE id = $${parameterIndex}
        RETURNING
          id,
          name,
          email,
          emp_id,
          status,
          profile_img_url,
          created_at,
          updated_at
      `,
      values
    );

    const employee = employeeResult.rows[0];

    /*
     * If a new role was supplied, update the employee's role.
     * Otherwise, if the employee status changed, synchronize
     * the existing role assignment status.
     */
    if (roleId !== undefined) {
      const roleAssignmentResult = await client.query(
        `
          UPDATE employee_roles
          SET
            role_id = $1,
            status = $3,
            updated_at = NOW()
          WHERE employee_id = $2
          RETURNING
            id,
            employee_id,
            role_id,
            status,
            created_at,
            updated_at
        `,
        [
          roleId,
          employeeId,
          status === "inactive" ? "inactive" : "active"
        ]
      );

      if (roleAssignmentResult.rows.length === 0) {
        await client.query(
          `
            INSERT INTO employee_roles (
              employee_id,
              role_id,
              status
            )
            VALUES ($1, $2, $3)
          `,
          [
            employeeId,
            roleId,
            status === "inactive" ? "inactive" : "active"
          ]
        );
      }
    } else if (status !== undefined) {
      await client.query(
        `
          UPDATE employee_roles
          SET
            status = $1,
            updated_at = NOW()
          WHERE employee_id = $2
        `,
        [
          status === "inactive" ? "inactive" : "active",
          employeeId
        ]
      );
    }

    await client.query("COMMIT");

    return {
      employee,
      role
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const deactivateEmployee = async (employeeId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const employeeResult = await client.query(
      `
        UPDATE employees
        SET
          status = 'inactive',
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          name,
          email,
          emp_id,
          status,
          profile_img_url,
          created_at,
          updated_at
      `,
      [employeeId]
    );

    if (employeeResult.rows.length === 0) {
      const error = new Error("Employee not found");
      error.statusCode = 404;
      error.isOperational = true;
      throw error;
    }

    const employee = employeeResult.rows[0];

    await client.query(
      `
        UPDATE employee_roles
        SET
          status = 'inactive',
          updated_at = NOW()
        WHERE employee_id = $1
      `,
      [employeeId]
    );

    await client.query("COMMIT");

    return employee;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};