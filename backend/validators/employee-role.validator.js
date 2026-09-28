import { validate as isUuid } from "uuid";

export const validateCreateEmployeeRole = (req, res, next) => {
  const {
    employeeId,
    roleId,
    status
  } = req.body;

  if (!employeeId || !isUuid(employeeId)) {
    return res.status(400).json({
      success: false,
      message: "Valid employee ID is required"
    });
  }

  if (!roleId || !isUuid(roleId)) {
    return res.status(400).json({
      success: false,
      message: "Valid role ID is required"
    });
  }

  if (
    status !== undefined &&
    !["active", "inactive"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message: "Status must be active or inactive"
    });
  }

  next();
};


export const validateUpdateEmployeeRole = (req, res, next) => {
  const allowedFields = [
    "employeeId",
    "roleId",
    "status"
  ];

  const providedFields = Object.keys(req.body);

  const invalidFields = providedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid field(s): ${invalidFields.join(", ")}`
    });
  }

  if (providedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one field is required for update"
    });
  }

  const {
    employeeId,
    roleId,
    status
  } = req.body;

  if (
    employeeId !== undefined &&
    !isUuid(employeeId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid employee ID"
    });
  }

  if (
    roleId !== undefined &&
    !isUuid(roleId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid role ID"
    });
  }

  if (
    status !== undefined &&
    !["active", "inactive"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message: "Status must be active or inactive"
    });
  }

  next();
};


export const validateEmployeeRoleId = (req, res, next) => {
  const { id } = req.params;

  if (!id || !isUuid(id)) {
    return res.status(400).json({
      success: false,
      message: "Valid employee role ID is required"
    });
  }

  next();
};