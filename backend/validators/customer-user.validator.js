import { validate as isUuid } from "uuid";

const ALLOWED_STATUSES = [
  "ACTIVE",
  "INACTIVE"
];

const validateOptionalString = (
  value,
  fieldName,
  maxLength = 255
) => {
  if (
    value !== undefined &&
    value !== null &&
    typeof value !== "string"
  ) {
    return `${fieldName} must be a string`;
  }

  if (
    typeof value === "string" &&
    value.length > maxLength
  ) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }

  return null;
};

const isValidDate = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  );
};

// GET /customer-users
export const validateCustomerUserList = (
  req,
  res,
  next
) => {
  const {
    page = 1,
    limit = 20,
    status
  } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "Page must be a positive integer"
    });
  }

  if (
    !Number.isInteger(limitNumber) ||
    limitNumber < 1 ||
    limitNumber > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Limit must be between 1 and 100"
    });
  }

  if (
    status &&
    !ALLOWED_STATUSES.includes(
      status.toUpperCase()
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer status"
    });
  }

  req.query.page = pageNumber;
  req.query.limit = limitNumber;

  if (status) {
    req.query.status = status.toUpperCase();
  }

  next();
};

// Validate customer ID
export const validateCustomerUserId = (
  req,
  res,
  next
) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer user ID"
    });
  }

  next();
};

// Validate POST
export const validateCreateCustomerUser = (
  req,
  res,
  next
) => {
  const {
    phone,
    email,
    full_name,
    profile_image_url,
    date_of_birth,
    gender,
    status
  } = req.body;

  if (!phone && !email) {
    return res.status(400).json({
      success: false,
      message: "Phone or email is required"
    });
  }

  let error;

  error = validateOptionalString(
    phone,
    "Phone",
    30
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    email,
    "Email",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    full_name,
    "Full name",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    profile_image_url,
    "Profile image URL",
    1000
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    gender,
    "Gender",
    50
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  if (date_of_birth !== undefined && date_of_birth !== null) {
    if (!isValidDate(date_of_birth)) {
      return res.status(400).json({
        success: false,
        message: "date_of_birth must be in YYYY-MM-DD format"
      });
    }
  }

  if (email) {
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    req.body.email = email.trim().toLowerCase();
  }

  if (phone) {
    req.body.phone = phone.trim();
  }

  if (full_name) {
    req.body.full_name = full_name.trim();
  }

  if (gender) {
    req.body.gender = gender.trim();
  }

  if (
    status &&
    !ALLOWED_STATUSES.includes(
      status.toUpperCase()
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer status"
    });
  }

  if (status) {
    req.body.status = status.toUpperCase();
  }

  next();
};

// Validate PUT
export const validateUpdateCustomerUser = (
  req,
  res,
  next
) => {
  const allowedFields = [
    "phone",
    "email",
    "full_name",
    "profile_image_url",
    "date_of_birth",
    "gender",
    "status"
  ];

  const providedFields = Object.keys(req.body);

  if (providedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message: "At least one field is required for update"
    });
  }

  const invalidFields = providedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid fields: ${invalidFields.join(", ")}`
    });
  }

  const {
    phone,
    email,
    full_name,
    profile_image_url,
    date_of_birth,
    gender,
    status
  } = req.body;

  let error;

  error = validateOptionalString(
    phone,
    "Phone",
    30
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    email,
    "Email",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    full_name,
    "Full name",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    profile_image_url,
    "Profile image URL",
    1000
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    gender,
    "Gender",
    50
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  if (date_of_birth !== undefined && date_of_birth !== null) {
    if (!isValidDate(date_of_birth)) {
      return res.status(400).json({
        success: false,
        message: "date_of_birth must be in YYYY-MM-DD format"
      });
    }
  }

  if (email) {
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    req.body.email = email.trim().toLowerCase();
  }

  if (phone) {
    req.body.phone = phone.trim();
  }

  if (full_name) {
    req.body.full_name = full_name.trim();
  }

  if (gender) {
    req.body.gender = gender.trim();
  }

  if (
    status &&
    !ALLOWED_STATUSES.includes(
      status.toUpperCase()
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer status"
    });
  }

  if (status) {
    req.body.status = status.toUpperCase();
  }

  next();
};