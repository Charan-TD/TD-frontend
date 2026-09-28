export const validateCreateEmployee = (req, res, next) => {
  const {
    name,
    email,
    empId,
    password,
    roleId
  } = req.body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Name is required"
    });
  }

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  if (!empId || typeof empId !== "string" || !empId.trim()) {
    return res.status(400).json({
      success: false,
      message: "Employee ID is required"
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Password is required"
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters"
    });
  }

  if (!roleId || typeof roleId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Role ID is required"
    });
  }

  req.body.email = normalizedEmail;
  req.body.name = name.trim();
  req.body.empId = empId.trim();

  next();
};

export const validateUpdateEmployee = (req, res, next) => {
  const allowedFields = [
    "name",
    "email",
    "empId",
    "password",
    "status",
    "profileImgUrl",
    "roleId"
  ];

  const suppliedFields = Object.keys(req.body);

  if (suppliedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one field is required for update"
    });
  }

  const invalidFields = suppliedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid fields: ${invalidFields.join(", ")}`
    });
  }

  if (req.body.name !== undefined) {
    if (
      typeof req.body.name !== "string" ||
      !req.body.name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid name"
      });
    }

    req.body.name = req.body.name.trim();
  }

  if (req.body.email !== undefined) {
    if (typeof req.body.email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid email"
      });
    }

    const email = req.body.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    req.body.email = email;
  }

  if (req.body.empId !== undefined) {
    if (
      typeof req.body.empId !== "string" ||
      !req.body.empId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID"
      });
    }

    req.body.empId = req.body.empId.trim();
  }

  if (req.body.password !== undefined) {
    if (
      typeof req.body.password !== "string" ||
      req.body.password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }
  }

  if (req.body.status !== undefined) {
    if (!["active", "inactive"].includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive"
      });
    }
  }

  if (req.body.profileImgUrl !== undefined) {
    if (
      req.body.profileImgUrl !== null &&
      typeof req.body.profileImgUrl !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid profile image URL"
      });
    }
  }

  if (req.body.roleId !== undefined) {
    if (typeof req.body.roleId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID"
      });
    }
  }

  next();
};