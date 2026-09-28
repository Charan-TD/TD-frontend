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

export const loginEmployee = async (email, password) => {

  // 1. Find employee by email
  const employee = await findEmployeeByEmail(email);

  if (!employee) {
    throw new AppError("Invalid email or password");
  }

  // 2. Check employee status
  if (employee.status !== "active") {
    throw new AppError("Employee account is not active");
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

  // 5. Get employee role
  const role = authorization.length > 0
    ? {
        id: authorization[0].role_id,
        name: authorization[0].role_name
      }
    : null;

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

    permissions: [
      ...new Set(
        authorization.map(
          (item) => item.permission_name
        )
      )
    ],

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

  const role =
    authorization.length > 0
      ? {
          id: authorization[0].role_id,
          name: authorization[0].role_name
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
    refreshToken: newRefreshToken
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