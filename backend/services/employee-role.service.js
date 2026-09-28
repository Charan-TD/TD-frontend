import {
  getEmployeeRoles,
  findEmployeeRoleById,
  employeeExists,
  roleExists,
  employeeRoleExists,
  createEmployeeRole,
  updateEmployeeRole,
  deactivateEmployeeRole
} from "../repositories/employee-role.repository.js";

import { AppError } from "../utils/app-error.js";


// List employee-role assignments
export const listEmployeeRoles = async ({ page, limit }) => {
  const result = await getEmployeeRoles({
    page,
    limit
  });

  const totalPages = Math.ceil(result.total / limit);

  return {
    employeeRoles: result.employeeRoles,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages
    }
  };
};


// Create employee-role assignment
export const createEmployeeRoleService = async ({
  employeeId,
  roleId,
  status = "active"
}) => {
  if (!employeeId || !roleId) {
    throw new AppError(
      "Employee ID and role ID are required",
      400
    );
  }

  if (!["active", "inactive"].includes(status)) {
    throw new AppError(
      "Status must be active or inactive",
      400
    );
  }

  const employee = await employeeExists(employeeId);

  if (!employee) {
    throw new AppError(
      "Employee not found",
      404
    );
  }

  const role = await roleExists(roleId);

  if (!role) {
    throw new AppError(
      "Role not found",
      404
    );
  }

  const duplicate = await employeeRoleExists({
    employeeId,
    roleId
  });

  if (duplicate) {
    throw new AppError(
      "Employee already has this role",
      409
    );
  }

  try {
    return await createEmployeeRole({
      employeeId,
      roleId,
      status
    });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "Employee role assignment already exists",
        409
      );
    }

    throw error;
  }
};


// Update employee-role assignment
export const updateEmployeeRoleService = async ({
  id,
  employeeId,
  roleId,
  status
}) => {
  if (!id) {
    throw new AppError(
      "Employee role ID is required",
      400
    );
  }

  const existing = await findEmployeeRoleById(id);

  if (!existing) {
    throw new AppError(
      "Employee role assignment not found",
      404
    );
  }

  if (employeeId !== undefined) {
    if (!employeeId) {
      throw new AppError(
        "Invalid employee ID",
        400
      );
    }

    const employee = await employeeExists(employeeId);

    if (!employee) {
      throw new AppError(
        "Employee not found",
        404
      );
    }
  }

  if (roleId !== undefined) {
    if (!roleId) {
      throw new AppError(
        "Invalid role ID",
        400
      );
    }

    const role = await roleExists(roleId);

    if (!role) {
      throw new AppError(
        "Role not found",
        404
      );
    }
  }

  if (status !== undefined) {
    if (!["active", "inactive"].includes(status)) {
      throw new AppError(
        "Status must be active or inactive",
        400
      );
    }
  }

  const finalEmployeeId =
    employeeId !== undefined
      ? employeeId
      : existing.employee_id;

  const finalRoleId =
    roleId !== undefined
      ? roleId
      : existing.role_id;

  const duplicate = await employeeRoleExists({
    employeeId: finalEmployeeId,
    roleId: finalRoleId,
    excludeId: id
  });

  if (duplicate) {
    throw new AppError(
      "Employee already has this role",
      409
    );
  }

  return await updateEmployeeRole({
    id,
    employeeId,
    roleId,
    status
  });
};


// Deactivate employee-role assignment
export const deleteEmployeeRoleService = async (id) => {
  if (!id) {
    throw new AppError(
      "Employee role ID is required",
      400
    );
  }

  const existing = await findEmployeeRoleById(id);

  if (!existing) {
    throw new AppError(
      "Employee role assignment not found",
      404
    );
  }

  if (existing.status === "inactive") {
    throw new AppError(
      "Employee role assignment is already inactive",
      400
    );
  }

  return await deactivateEmployeeRole(id);
};