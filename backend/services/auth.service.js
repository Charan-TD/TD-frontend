import {
  randomBytes,
  createHash,
  timingSafeEqual
} from "node:crypto";

import {
  findEmployeeByEmail,
  findEmployeeById,
  getEmployeeAuthorization,
  getEmployeePasswordHash,
  updateEmployeePassword
} from "../repositories/auth.repository.js";

import {
  verifyPassword,
  hashPassword
} from "./password.service.js";

import { AppError } from "../utils/app-error.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from "./jwt.service.js";


// Development-only storage.
// Tokens are lost when the server restarts.
const employeeResetTokens = new Map();

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

const hashResetToken = (token) =>
  createHash("sha256")
    .update(token)
    .digest();

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

export const loginEmployee = async (email, password) => {

  // 1. Find employee by email
  const employee = await findEmployeeByEmail(email);

  if (!employee) {
    throw new AppError("Invalid email or password");
  }

  // 2. Check employee status
  if (employee.status !== "active") {
  throw new AppError(
    "Employee account is not active",
    403
  );
  }

  // 3. Verify password using Argon2
  const passwordValid = await verifyPassword(
    password,
    employee.password_hash
  );

  if (!passwordValid) {
    throw new AppError("Invalid email or password");
  }

  // 4. Get employee role and permissions
const authorization = await getEmployeeAuthorization(
  employee.id
);

if (!authorization) {
  throw new AppError(
    "No active role assigned to this employee",
    403
  );
}

const role = {
  id: authorization.role_id,
  name: authorization.role_name
};
  // 6. Generate access token
  const accessToken = generateAccessToken({
  sub: employee.id,
  user_type: "employee",
  role_id: role.id,
  token_type: "access",
  token_version: employee.token_version
});

const refreshToken = generateRefreshToken({
  sub: employee.id,
  user_type: "employee",
  role_id: role.id,
  token_type: "refresh",
  token_version: employee.token_version
});

  // 8. Return login result
  return {
    employee: {
      id: employee.id,
      emp_id: employee.emp_id,
      name: employee.name,
      email: employee.email,
      profile_img_url: employee.profile_img_url
    },

    role,

    permissions: authorization.permission_code || {},

    accessToken,

    refreshToken
  };
};

export const refreshEmployeeAccessToken = async (
  refreshToken
) => {
  if (!refreshToken) {
    throw new AppError(
      "Refresh token is required",
      400
    );
  }

  const decoded =
    verifyRefreshToken(refreshToken);

  if (
    decoded.user_type !== "employee" ||
    decoded.token_type !== "refresh"
  ) {
    throw new AppError(
      "Invalid refresh token",
      401
    );
  }

  const employee =
    await findEmployeeById(decoded.sub);

  if (!employee) {
    throw new AppError(
      "Employee not found",
      401
    );
  }

  if (employee.status !== "active") {
    throw new AppError(
      "Employee account is not active",
      401
    );
  }

  // Check whether the refresh token
  // belongs to the current token version
  if (
    decoded.token_version !==
    employee.token_version
  ) {
    throw new AppError(
      "Refresh token is no longer valid",
      401
    );
  }

  const authorization =
    await getEmployeeAuthorization(
      employee.id
    );

  const role = authorization
  ? {
      id: authorization.role_id,
      name: authorization.role_name
    }
  : null;

  const accessToken =
    generateAccessToken({
      sub: employee.id,
      role_id: role?.id || null,
      user_type: "employee",
      token_type: "access",
      token_version: employee.token_version
    });

  const newRefreshToken =
    generateRefreshToken({
      sub: employee.id,
      role_id: role?.id || null,
      user_type: "employee",
      token_type: "refresh",
      token_version: employee.token_version
    });

  return {
  accessToken,
  refreshToken: newRefreshToken,
  permissions: authorization?.permission_code || {},
  role
  };
};

export const changeEmployeePassword = async (
  employeeId,
  currentPassword,
  newPassword
) => {
  if (!currentPassword) {
    throw new AppError(
      "Current password is required",
      400
    );
  }

  if (!newPassword) {
    throw new AppError(
      "New password is required",
      400
    );
  }

  if (newPassword.length < 8) {
    throw new AppError(
      "New password must be at least 8 characters",
      400
    );
  }

  if (currentPassword === newPassword) {
    throw new AppError(
      "New password must be different from current password",
      400
    );
  }

  const employee =
    await getEmployeePasswordHash(employeeId);

  if (!employee) {
    throw new AppError(
      "Employee not found",
      404
    );
  }

  if (employee.status !== "active") {
    throw new AppError(
      "Employee account is not active",
      403
    );
  }

  const isCurrentPasswordValid =
    await verifyPassword(
      currentPassword,
      employee.password_hash
    );

  if (!isCurrentPasswordValid) {
    throw new AppError(
      "Current password is incorrect",
      401
    );
  }

  const newPasswordHash =
    await hashPassword(newPassword);

  await updateEmployeePassword(
    employeeId,
    newPasswordHash
  );

  return {
    message: "Password changed successfully"
  };
};

export const requestEmployeePasswordReset = async (email) => {
  if (typeof email !== "string" || !email.trim()) {
    throw new AppError("Valid email is required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const employee = await findEmployeeByEmail(normalizedEmail);

  const genericMessage =
    "If an account exists with this email, password reset instructions have been generated.";

  if (!employee || employee.status !== "active") {
    return {
      message: genericMessage
    };
  }

  const resetToken = randomBytes(32).toString("hex");

  employeeResetTokens.set(String(employee.id), {
    tokenHash: hashResetToken(resetToken),
    expiresAt: Date.now() + RESET_TOKEN_EXPIRY_MS
  });

  return {
    message: genericMessage,
    ...(process.env.NODE_ENV !== "production" && {
      data: {
        resetToken,
        expiresIn: 900
      }
    })
  };
};

export const resetEmployeePassword = async ({
  email,
  token,
  newPassword
}) => {
  if (typeof email !== "string" || !email.trim()) {
    throw new AppError("Email is required", 400);
  }

  if (typeof token !== "string" || !token.trim()) {
    throw new AppError("Reset token is required", 400);
  }

  validateNewPassword(newPassword);

  const normalizedEmail = email.trim().toLowerCase();

  const employee = await findEmployeeByEmail(normalizedEmail);

  if (!employee || employee.status !== "active") {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const stored = employeeResetTokens.get(String(employee.id));

  if (!stored || Date.now() >= stored.expiresAt) {
    employeeResetTokens.delete(String(employee.id));
    throw new AppError("Invalid or expired reset token", 400);
  }

  const suppliedHash = hashResetToken(token);

  if (
    suppliedHash.length !== stored.tokenHash.length ||
    !timingSafeEqual(suppliedHash, stored.tokenHash)
  ) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const isSamePassword = await verifyPassword(
    newPassword,
    employee.password_hash
  );

  if (isSamePassword) {
    throw new AppError(
      "New password must be different from current password",
      400
    );
  }

  const newPasswordHash = await hashPassword(newPassword);

  await updateEmployeePassword(
    employee.id,
    newPasswordHash
  );

  // Token cannot be reused after successful reset.
  employeeResetTokens.delete(String(employee.id));

  return {
    message: "Employee password reset successfully"
  };
};