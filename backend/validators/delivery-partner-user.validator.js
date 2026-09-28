import { validate as isUuid } from "uuid";

const ALLOWED_STATUSES = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "REJECTED"
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
    value.trim().length > maxLength
  ) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }

  return null;
};

const validateRequiredString = (
  value,
  fieldName,
  maxLength = 255
) => {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return `${fieldName} is required`;
  }

  if (value.trim().length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }

  return null;
};

const isValidDate = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
};

const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const normalizeStatus = (status) => {
  return status?.toUpperCase();
};

// GET /delivery-partner-users
export const validateDeliveryPartnerList = (
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

  if (status) {
    const normalizedStatus =
      normalizeStatus(status);

    if (
      !ALLOWED_STATUSES.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery partner status"
      });
    }

    req.query.status = normalizedStatus;
  }

  req.query.page = pageNumber;
  req.query.limit = limitNumber;

  next();
};

// Validate delivery partner ID
export const validateDeliveryPartnerUserId = (
  req,
  res,
  next
) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid delivery partner ID"
    });
  }

  next();
};

// Validate POST
export const validateCreateDeliveryPartnerUser = (
  req,
  res,
  next
) => {
  const {
    license_number,
    license_verified,
    aadhaar_verified,
    bank_account_number,
    bank_ifsc,
    bank_account_holder,
    status,
    profile_image_url,
    phone,
    email,
    full_name,
    date_of_birth,
    gender,
    vehicle_type,
    vehicle_number
  } = req.body;

  let error;

  error = validateRequiredString(
    license_number,
    "License number",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateRequiredString(
    bank_account_number,
    "Bank account number",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateRequiredString(
    bank_ifsc,
    "Bank IFSC",
    11
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateRequiredString(
    bank_account_holder,
    "Bank account holder",
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

  error = validateOptionalString(
    vehicle_type,
    "Vehicle type",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    vehicle_number,
    "Vehicle number",
    50
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  if (
    license_verified !== undefined &&
    typeof license_verified !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "license_verified must be a boolean"
    });
  }

  if (
    aadhaar_verified !== undefined &&
    typeof aadhaar_verified !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "aadhaar_verified must be a boolean"
    });
  }

  if (email) {
    const normalizedEmail =
      email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    req.body.email = normalizedEmail;
  }

  if (date_of_birth !== undefined && date_of_birth !== null) {
    if (!isValidDate(date_of_birth)) {
      return res.status(400).json({
        success: false,
        message:
          "date_of_birth must be in YYYY-MM-DD format"
      });
    }
  }

  if (status) {
    const normalizedStatus =
      normalizeStatus(status);

    if (
      !ALLOWED_STATUSES.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery partner status"
      });
    }

    req.body.status = normalizedStatus;
  }

  req.body.license_number =
    license_number.trim();

  req.body.bank_account_number =
    bank_account_number.trim();

  req.body.bank_ifsc =
    bank_ifsc.trim().toUpperCase();

  req.body.bank_account_holder =
    bank_account_holder.trim();

  if (phone) {
    req.body.phone = phone.trim();
  }

  if (full_name) {
    req.body.full_name = full_name.trim();
  }

  if (gender) {
    req.body.gender = gender.trim();
  }

  if (vehicle_type) {
    req.body.vehicle_type = vehicle_type.trim();
  }

  if (vehicle_number) {
    req.body.vehicle_number =
      vehicle_number.trim().toUpperCase();
  }

  next();
};

// Validate PUT
export const validateUpdateDeliveryPartnerUser = (
  req,
  res,
  next
) => {
  const allowedFields = [
    "license_number",
    "license_verified",
    "aadhaar_verified",
    "bank_account_number",
    "bank_ifsc",
    "bank_account_holder",
    "status",
    "profile_image_url",
    "phone",
    "email",
    "full_name",
    "date_of_birth",
    "gender",
    "vehicle_type",
    "vehicle_number"
  ];

  const providedFields = Object.keys(req.body);

  if (providedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "At least one field is required for update"
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
    license_number,
    license_verified,
    aadhaar_verified,
    bank_account_number,
    bank_ifsc,
    bank_account_holder,
    status,
    profile_image_url,
    phone,
    email,
    full_name,
    date_of_birth,
    gender,
    vehicle_type,
    vehicle_number
  } = req.body;

  let error;

  error = validateOptionalString(
    license_number,
    "License number",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    bank_account_number,
    "Bank account number",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    bank_ifsc,
    "Bank IFSC",
    11
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    bank_account_holder,
    "Bank account holder",
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

  error = validateOptionalString(
    vehicle_type,
    "Vehicle type",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    vehicle_number,
    "Vehicle number",
    50
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  if (
    license_verified !== undefined &&
    typeof license_verified !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "license_verified must be a boolean"
    });
  }

  if (
    aadhaar_verified !== undefined &&
    typeof aadhaar_verified !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "aadhaar_verified must be a boolean"
    });
  }

  if (email) {
    const normalizedEmail =
      email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    req.body.email = normalizedEmail;
  }

  if (date_of_birth !== undefined && date_of_birth !== null) {
    if (!isValidDate(date_of_birth)) {
      return res.status(400).json({
        success: false,
        message:
          "date_of_birth must be in YYYY-MM-DD format"
      });
    }
  }

  if (status) {
    const normalizedStatus =
      normalizeStatus(status);

    if (
      !ALLOWED_STATUSES.includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery partner status"
      });
    }

    req.body.status = normalizedStatus;
  }

  if (license_number) {
    req.body.license_number =
      license_number.trim();
  }

  if (bank_account_number) {
    req.body.bank_account_number =
      bank_account_number.trim();
  }

  if (bank_ifsc) {
    req.body.bank_ifsc =
      bank_ifsc.trim().toUpperCase();
  }

  if (bank_account_holder) {
    req.body.bank_account_holder =
      bank_account_holder.trim();
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

  if (vehicle_type) {
    req.body.vehicle_type = vehicle_type.trim();
  }

  if (vehicle_number) {
    req.body.vehicle_number =
      vehicle_number.trim().toUpperCase();
  }

  next();
};

// Validate PATCH /:id/status
export const validateDeliveryPartnerStatus = (
  req,
  res,
  next
) => {
  const { status } = req.body;

  if (
    !status ||
    typeof status !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Status is required"
    });
  }

  const normalizedStatus =
    status.toUpperCase();

  if (
    !ALLOWED_STATUSES.includes(
      normalizedStatus
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid delivery partner status"
    });
  }

  req.body.status = normalizedStatus;

  next();
};