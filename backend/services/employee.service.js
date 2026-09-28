import {
  getEmployees,
  createEmployeeWithRole,
  updateEmployeeWithRole,
  deactivateEmployee
} from "../repositories/employee.repository.js";

import { hashPassword } from "./password.service.js";
import { AppError } from "../utils/app-error.js";

export const listEmployees = async ({ page, limit }) => {
  const result = await getEmployees({
    page,
    limit
  });

  const totalPages = Math.ceil(result.total / limit);

  return {
    employees: result.employees,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages
    }
  };
};

export const createEmployee = async ({
  name,
  email,
  empId,
  password,
  status = "active",
  profileImgUrl = null,
  roleId
}) => {
  if (!name || !email || !empId || !password || !roleId) {
    throw new AppError(
      "Name, email, employee ID, password and role ID are required",
      400
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const passwordHash = await hashPassword(password);

  try {
    return await createEmployeeWithRole({
      name: name.trim(),
      email: normalizedEmail,
      empId: empId.trim(),
      passwordHash,
      status,
      profileImgUrl,
      roleId
    });
  } catch (error) {
    if (error.code === "23505") {
      if (error.constraint === "employees_email_key") {
        throw new AppError("Email already exists", 409);
      }

      if (error.constraint === "employees_emp_id_key") {
        throw new AppError("Employee ID already exists", 409);
      }

      throw new AppError("Employee already exists", 409);
    }

    throw error;
  }
};

export const updateEmployee = async ({
  employeeId,
  name,
  email,
  empId,
  password,
  status,
  profileImgUrl,
  roleId
}) => {
  if (!employeeId) {
    throw new AppError("Employee ID is required", 400);
  }

  const hasUpdate =
    name !== undefined ||
    email !== undefined ||
    empId !== undefined ||
    password !== undefined ||
    status !== undefined ||
    profileImgUrl !== undefined ||
    roleId !== undefined;

  if (!hasUpdate) {
    throw new AppError(
      "At least one field is required for update",
      400
    );
  }

  let normalizedEmail;
  let passwordHash;

  if (email !== undefined) {
    if (typeof email !== "string" || !email.trim()) {
      throw new AppError("Invalid email", 400);
    }

    normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      throw new AppError("Invalid email format", 400);
    }
  }

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw new AppError("Invalid name", 400);
    }
  }

  if (empId !== undefined) {
    if (typeof empId !== "string" || !empId.trim()) {
      throw new AppError("Invalid employee ID", 400);
    }
  }

  if (password !== undefined) {
    if (typeof password !== "string" || password.length < 8) {
      throw new AppError(
        "Password must be at least 8 characters",
        400
      );
    }

    passwordHash = await hashPassword(password);
  }

  if (status !== undefined) {
    if (!["active", "inactive"].includes(status)) {
      throw new AppError(
        "Status must be active or inactive",
        400
      );
    }
  }

  try {
    return await updateEmployeeWithRole({
      employeeId,
      name: name !== undefined ? name.trim() : undefined,
      email: normalizedEmail,
      empId: empId !== undefined ? empId.trim() : undefined,
      passwordHash,
      status,
      profileImgUrl,
      roleId
    });
  } catch (error) {
    if (error.code === "23505") {
      if (error.constraint === "employees_email_key") {
        throw new AppError("Email already exists", 409);
      }

      if (error.constraint === "employees_emp_id_key") {
        throw new AppError("Employee ID already exists", 409);
      }

      throw new AppError("Employee already exists", 409);
    }

    throw error;
  }
};

export const deleteEmployee = async (employeeId) => {
  if (!employeeId) {
    throw new AppError("Employee ID is required", 400);
  }

  return await deactivateEmployee(employeeId);
};