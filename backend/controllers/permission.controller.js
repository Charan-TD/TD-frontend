import {
  listPermissions,
  createPermissionService,
  updatePermissionService,
  deletePermissionService
} from "../services/permission.service.js";


// GET /api/v1/permissions
export const getPermissions = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Page must be >= 1 and limit must be between 1 and 100"
      });
    }

    const result = await listPermissions({
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      message: "Permissions retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};


// POST /api/v1/permissions
export const createPermissionController = async (
  req,
  res,
  next
) => {
  try {
    const { permissionName } = req.body;

    const result = await createPermissionService(
      permissionName
    );

    return res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};


// PATCH /api/v1/permissions/:id
export const updatePermissionController = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { permissionName } = req.body;

    const result = await updatePermissionService({
      id,
      permissionName
    });

    return res.status(200).json({
      success: true,
      message: "Permission updated successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};


// DELETE /api/v1/permissions/:id
export const deletePermissionController = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const result = await deletePermissionService(id);

    return res.status(200).json({
      success: true,
      message: "Permission deleted successfully",
      data: {
        permission: result
      }
    });
  } catch (error) {
    next(error);
  }
};