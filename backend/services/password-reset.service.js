import crypto from "crypto";

import pool from "../config/database.js";
import { findEmployeeByEmail } from "../repositories/auth.repository.js";
import { hashPassword } from "./password.service.js";
import { AppError } from "../utils/app-error.js";


// Generate a secure random reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};


// Hash the reset token before storing it
const hashResetToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};


// Request employee password reset
export const requestEmployeePasswordReset = async (email) => {
  const employee = await findEmployeeByEmail(email);

  /*
   * Do not reveal whether an email exists.
   * This prevents account enumeration.
   */
  if (!employee || employee.status !== "active") {
    return;
  }

  const resetToken = generateResetToken();
  const tokenHash = hashResetToken(resetToken);

  const expiresAt = new Date(
    Date.now() + 15 * 60 * 1000
  );

  // Invalidate previous unused reset tokens
  await pool.query(
    `
    UPDATE employee_password_resets
    SET used_at = now()
    WHERE employee_id = $1
      AND used_at IS NULL
    `,
    [employee.id]
  );

  // Store only the hash
  await pool.query(
    `
    INSERT INTO employee_password_resets (
      employee_id,
      token_hash,
      expires_at
    )
    VALUES ($1, $2, $3)
    `,
    [
      employee.id,
      tokenHash,
      expiresAt
    ]
  );

  /*
   * Development only:
   * Return the raw token temporarily so we can test
   * the complete flow before connecting email/SMS.
   *
   * Remove this before production.
   */
  return {
    resetToken
  };
};


// Reset employee password
export const resetEmployeePassword = async ({
  token,
  newPassword
}) => {
  if (!token) {
    throw new AppError(
      "Reset token is required",
      400
    );
  }

  if (
    !newPassword ||
    typeof newPassword !== "string" ||
    newPassword.length < 8
  ) {
    throw new AppError(
      "Password must be at least 8 characters",
      400
    );
  }

  const tokenHash = hashResetToken(token);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const resetResult = await client.query(
      `
      SELECT
        id,
        employee_id,
        expires_at,
        used_at
      FROM employee_password_resets
      WHERE token_hash = $1
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHash]
    );

    if (resetResult.rows.length === 0) {
      throw new AppError(
        "Invalid or expired reset token",
        400
      );
    }

    const resetRequest = resetResult.rows[0];

    if (resetRequest.used_at) {
      throw new AppError(
        "Reset token has already been used",
        400
      );
    }

    if (
      new Date(resetRequest.expires_at).getTime() <=
      Date.now()
    ) {
      throw new AppError(
        "Invalid or expired reset token",
        400
      );
    }

    const employeeResult = await client.query(
      `
      SELECT
        id,
        status
      FROM employees
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [resetRequest.employee_id]
    );

    if (employeeResult.rows.length === 0) {
      throw new AppError(
        "Employee not found",
        404
      );
    }

    const employee = employeeResult.rows[0];

    if (employee.status !== "active") {
      throw new AppError(
        "Employee account is not active",
        403
      );
    }

    const passwordHash = await hashPassword(
      newPassword
    );

    await client.query(
      `
      UPDATE employees
      SET
        password_hash = $1,
        updated_at = now()
      WHERE id = $2
      `,
      [
        passwordHash,
        employee.id
      ]
    );

    // Mark reset token as used
    await client.query(
      `
      UPDATE employee_password_resets
      SET used_at = now()
      WHERE id = $1
      `,
      [resetRequest.id]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};