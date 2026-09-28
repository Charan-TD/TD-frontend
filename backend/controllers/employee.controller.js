import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from "../services/employee.service.js";

export const getEmployees = async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Page must be >= 1 and limit must be between 1 and 100"
      });
    }

    const result = await listEmployees({
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      message: "Employees retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const createEmployeeController = async (req, res, next) => {
  try {
    const {
      name,
      email,
      empId,
      password,
      status,
      profileImgUrl,
      roleId
    } = req.body;

    const result = await createEmployee({
      name,
      email,
      empId,
      password,
      status,
      profileImgUrl,
      roleId
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployeeController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      empId,
      password,
      status,
      profileImgUrl,
      roleId
    } = req.body;

    const result = await updateEmployee({
      employeeId: id,
      name,
      email,
      empId,
      password,
      status,
      profileImgUrl,
      roleId
    });

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployeeController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await deleteEmployee(id);

    return res.status(200).json({
      success: true,
      message: "Employee deactivated successfully",
      data: {
        employee: result
      }
    });
  } catch (error) {
    next(error);
  }
};