
import crypto from "node:crypto";

import pool from "../config/database.js";
import { findEmployeeByEmail } from "../repositories/auth.repository.js";
import {
  hashPassword,
  verifyPassword
} from "./password.service.js";
import { AppError } from "../utils/app-error.js";

const RESET_TOKEN_EXPIRY_MINUTES = 15;
const RESET_TOKEN_EXPIRY_SECONDS = 900;

const generateResetToken = () =>
  crypto.randomBytes(32).toString("hex");

const hashResetToken = (token) =>
  crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

const validateNewPassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    throw new AppError(
      "New password must be between 8 and 128 characters",
      400
    );
  }
};

// POST /api/v1/auth/employee/forgot-password
export const requestEmployeePasswordReset = async (email) => {
  if (typeof email !== "string" || !email.trim()) {
    throw new AppError("Valid email is required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const employee = await findEmployeeByEmail(
    normalizedEmail
  );

  const message =
    "If an account exists with this email, password reset instructions have been generated.";

  if (!employee || employee.status !== "active") {
    return { message };
  }

  const resetToken = generateResetToken();
  const tokenHash = hashResetToken(resetToken);

  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Invalidate previous unused tokens.
    await client.query(
      `
      UPDATE employee_password_resets
      SET used_at = NOW()
      WHERE employee_id = $1
        AND used_at IS NULL
      `,
      [employee.id]
    );

    // Store the token hash, never the raw token.
    await client.query(
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

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    message,
    ...(process.env.NODE_ENV !== "production" && {
      data: {
        resetToken,
        expiresIn: RESET_TOKEN_EXPIRY_SECONDS
      }
    })
  };
};

// POST /api/v1/auth/employee/reset-password
export const resetEmployeePassword = async ({
  token,
  newPassword
}) => {
  if (
    typeof token !== "string" ||
    !/^[a-fA-F0-9]{64}$/.test(token)
  ) {
    throw new AppError(
      "Valid reset token is required",
      400
    );
  }

  validateNewPassword(newPassword);

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
        status,
        password_hash
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

    const samePassword = await verifyPassword(
      newPassword,
      employee.password_hash
    );

    if (samePassword) {
      throw new AppError(
        "New password must be different from current password",
        400
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
        updated_at = NOW(),
        token_version = token_version + 1
      WHERE id = $2
      `,
      [
        passwordHash,
        employee.id
      ]
    );

    // Invalidate all outstanding reset tokens.
    await client.query(
      `
      UPDATE employee_password_resets
      SET used_at = NOW()
      WHERE employee_id = $1
        AND used_at IS NULL
      `,
      [employee.id]
    );

    await client.query("COMMIT");

    return {
      message: "Employee password reset successfully"
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
