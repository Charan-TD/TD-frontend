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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime());
};

const isValidPan = (value) => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
};

const isValidGstin = (value) => {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
    value
  );
};

// GET /restaurants
export const validateRestaurantList = (
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
      message: "Invalid restaurant status"
    });
  }

  req.query.page = pageNumber;
  req.query.limit = limitNumber;

  if (status) {
    req.query.status = status.toUpperCase();
  }

  next();
};

// Validate restaurant ID
export const validateRestaurantId = (
  req,
  res,
  next
) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid restaurant ID"
    });
  }

  next();
};

// Validate POST /restaurants
export const validateCreateRestaurant = (
  req,
  res,
  next
) => {
  const {
    name,
    business_type,
    legal_name,
    pan,
    gstin,
    fssai_number,
    fssai_valid_until,
    bank_account_number,
    bank_ifsc,
    bank_account_holder,
    status
  } = req.body;

  if (
    !name ||
    typeof name !== "string" ||
    name.trim().length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Restaurant name is required"
    });
  }

  if (
    !business_type ||
    typeof business_type !== "string" ||
    business_type.trim().length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Business type is required"
    });
  }

  let error;

  error = validateOptionalString(
    name,
    "Name",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    business_type,
    "Business type",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    legal_name,
    "Legal name",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    pan,
    "PAN",
    10
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    gstin,
    "GSTIN",
    15
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    fssai_number,
    "FSSAI number",
    50
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

  if (pan) {
    req.body.pan = pan.trim().toUpperCase();

    if (!isValidPan(req.body.pan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN format"
      });
    }
  }

  if (gstin) {
    req.body.gstin = gstin.trim().toUpperCase();

    if (!isValidGstin(req.body.gstin)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GSTIN format"
      });
    }
  }

  if (fssai_valid_until !== undefined && fssai_valid_until !== null) {
    if (!isValidDate(fssai_valid_until)) {
      return res.status(400).json({
        success: false,
        message: "fssai_valid_until must be in YYYY-MM-DD format"
      });
    }
  }

  if (status) {
    if (
      !ALLOWED_STATUSES.includes(
        status.toUpperCase()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant status"
      });
    }

    req.body.status = status.toUpperCase();
  }

  req.body.name = name.trim();
  req.body.business_type = business_type.trim();

  if (legal_name) {
    req.body.legal_name = legal_name.trim();
  }

  if (fssai_number) {
    req.body.fssai_number = fssai_number.trim();
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

  next();
};

// Validate PUT /restaurants/:id
export const validateUpdateRestaurant = (
  req,
  res,
  next
) => {
  const allowedFields = [
    "name",
    "business_type",
    "legal_name",
    "pan",
    "gstin",
    "fssai_number",
    "fssai_valid_until",
    "bank_account_number",
    "bank_ifsc",
    "bank_account_holder",
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
    name,
    business_type,
    legal_name,
    pan,
    gstin,
    fssai_number,
    fssai_valid_until,
    bank_account_number,
    bank_ifsc,
    bank_account_holder,
    status
  } = req.body;

  let error;

  error = validateOptionalString(
    name,
    "Name",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    business_type,
    "Business type",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    legal_name,
    "Legal name",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    pan,
    "PAN",
    10
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    gstin,
    "GSTIN",
    15
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    fssai_number,
    "FSSAI number",
    50
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

  if (name !== undefined) {
    if (name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Restaurant name cannot be empty"
      });
    }

    req.body.name = name.trim();
  }

  if (business_type !== undefined) {
    if (business_type.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Business type cannot be empty"
      });
    }

    req.body.business_type =
      business_type.trim();
  }

  if (pan) {
    req.body.pan = pan.trim().toUpperCase();

    if (!isValidPan(req.body.pan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN format"
      });
    }
  }

  if (gstin) {
    req.body.gstin = gstin.trim().toUpperCase();

    if (!isValidGstin(req.body.gstin)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GSTIN format"
      });
    }
  }

  if (
    fssai_valid_until !== undefined &&
    fssai_valid_until !== null
  ) {
    if (!isValidDate(fssai_valid_until)) {
      return res.status(400).json({
        success: false,
        message: "fssai_valid_until must be in YYYY-MM-DD format"
      });
    }
  }

  if (fssai_number) {
    req.body.fssai_number =
      fssai_number.trim();
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

  if (legal_name) {
    req.body.legal_name =
      legal_name.trim();
  }

  if (status) {
    if (
      !ALLOWED_STATUSES.includes(
        status.toUpperCase()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant status"
      });
    }

    req.body.status =
      status.toUpperCase();
  }

  next();
};