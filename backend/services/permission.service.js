import {
  getPermissions,
  findPermissionById,
  permissionNameExists,
  createPermission,
  updatePermission,
  deletePermission
} from "../repositories/permission.repository.js";

import { AppError } from "../utils/app-error.js";


// List permissions
export const listPermissions = async ({ page, limit }) => {
  const result = await getPermissions({
    page,
    limit
  });

  const totalPages = Math.ceil(result.total / limit);

  return {
    permissions: result.permissions,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages
    }
  };
};


// Create permission
export const createPermissionService = async (
  permissionName
) => {
  if (
    !permissionName ||
    typeof permissionName !== "string" ||
    !permissionName.trim()
  ) {
    throw new AppError(
      "Permission name is required",
      400
    );
  }

  const normalizedName = permissionName.trim();

  const exists = await permissionNameExists(
    normalizedName
  );

  if (exists) {
    throw new AppError(
      "Permission already exists",
      409
    );
  }

  try {
    return await createPermission(normalizedName);
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "Permission already exists",
        409
      );
    }

    throw error;
  }
};


// Update permission
export const updatePermissionService = async ({
  id,
  permissionName
}) => {
  if (!id) {
    throw new AppError(
      "Permission ID is required",
      400
    );
  }

  if (
    !permissionName ||
    typeof permissionName !== "string" ||
    !permissionName.trim()
  ) {
    throw new AppError(
      "Permission name is required",
      400
    );
  }

  const existing = await findPermissionById(id);

  if (!existing) {
    throw new AppError(
      "Permission not found",
      404
    );
  }

  const normalizedName = permissionName.trim();

  const duplicate = await permissionNameExists(
    normalizedName,
    id
  );

  if (duplicate) {
    throw new AppError(
      "Permission already exists",
      409
    );
  }

  try {
    return await updatePermission({
      id,
      permissionName: normalizedName
    });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "Permission already exists",
        409
      );
    }

    throw error;
  }
};


// Delete permission
export const deletePermissionService = async (id) => {
  if (!id) {
    throw new AppError(
      "Permission ID is required",
      400
    );
  }

  const existing = await findPermissionById(id);

  if (!existing) {
    throw new AppError(
      "Permission not found",
      404
    );
  }

  try {
    return await deletePermission(id);
  } catch (error) {
    // Foreign-key violation
    if (error.code === "23503") {
      throw new AppError(
        "Permission cannot be deleted because it is assigned to a role",
        409
      );
    }

    throw error;
  }
};