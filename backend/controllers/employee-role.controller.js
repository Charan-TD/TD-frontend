import {
  listEmployeeRoles,
  createEmployeeRoleService,
  updateEmployeeRoleService,
  deleteEmployeeRoleService
} from "../services/employee-role.service.js";


// GET /employee-roles
export const getEmployeeRoles = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Page must be >= 1 and limit must be between 1 and 100"
      });
    }

    const result = await listEmployeeRoles({
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      message: "Employee roles retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};


// POST /employee-roles
export const createEmployeeRoleController = async (
  req,
  res,
  next
) => {
  try {
    const {
      employeeId,
      roleId,
      status
    } = req.body;

    const result = await createEmployeeRoleService({
      employeeId,
      roleId,
      status
    });

    return res.status(201).json({
      success: true,
      message: "Employee role assigned successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};


// PATCH /employee-roles/:id
export const updateEmployeeRoleController = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const {
      employeeId,
      roleId,
      status
    } = req.body;

    const result = await updateEmployeeRoleService({
      id,
      employeeId,
      roleId,
      status
    });

    return res.status(200).json({
      success: true,
      message: "Employee role updated successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};


// DELETE /employee-roles/:id
export const deleteEmployeeRoleController = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const result = await deleteEmployeeRoleService(id);

    return res.status(200).json({
      success: true,
      message: "Employee role deactivated successfully",
      data: {
        employeeRole: result
      }
    });
  } catch (error) {
    next(error);
  }
};