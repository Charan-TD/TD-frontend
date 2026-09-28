import { validate as isUuid } from "uuid";

const validateString = (
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

const validateCoordinate = (
  value,
  fieldName,
  min,
  max
) => {
  if (value === undefined || value === null) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${fieldName} must be a valid number`;
  }

  if (number < min || number > max) {
    return `${fieldName} must be between ${min} and ${max}`;
  }

  return null;
};

// GET /stations
export const validateStationList = (
  req,
  res,
  next
) => {
  const {
    page = 1,
    limit = 20
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

  req.query.page = pageNumber;
  req.query.limit = limitNumber;

  next();
};

// Validate station ID
export const validateStationId = (
  req,
  res,
  next
) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid station ID"
    });
  }

  next();
};

// Validate POST /stations
export const validateCreateStation = (
  req,
  res,
  next
) => {
  const {
    name,
    code,
    city,
    state,
    latitude,
    longitude
  } = req.body;

  let error;

  error = validateString(
    name,
    "Station name",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateString(
    code,
    "Station code",
    20
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateString(
    city,
    "City",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateString(
    state,
    "State",
    100
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateCoordinate(
    latitude,
    "Latitude",
    -90,
    90
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateCoordinate(
    longitude,
    "Longitude",
    -180,
    180
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  req.body.name = name.trim();
  req.body.code = code.trim().toUpperCase();
  req.body.city = city.trim();
  req.body.state = state.trim();

  if (latitude !== undefined && latitude !== null) {
    req.body.latitude = Number(latitude);
  }

  if (longitude !== undefined && longitude !== null) {
    req.body.longitude = Number(longitude);
  }

  next();
};

// Validate PUT /stations/:id
export const validateUpdateStation = (
  req,
  res,
  next
) => {
  const allowedFields = [
    "name",
    "code",
    "city",
    "state",
    "latitude",
    "longitude"
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
    code,
    city,
    state,
    latitude,
    longitude
  } = req.body;

  let error;

  if (name !== undefined) {
    error = validateString(
      name,
      "Station name",
      255
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    req.body.name = name.trim();
  }

  if (code !== undefined) {
    error = validateString(
      code,
      "Station code",
      20
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    req.body.code = code.trim().toUpperCase();
  }

  if (city !== undefined) {
    error = validateString(
      city,
      "City",
      100
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    req.body.city = city.trim();
  }

  if (state !== undefined) {
    error = validateString(
      state,
      "State",
      100
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }

    req.body.state = state.trim();
  }

  error = validateCoordinate(
    latitude,
    "Latitude",
    -90,
    90
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateCoordinate(
    longitude,
    "Longitude",
    -180,
    180
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  if (latitude !== undefined && latitude !== null) {
    req.body.latitude = Number(latitude);
  }

  if (longitude !== undefined && longitude !== null) {
    req.body.longitude = Number(longitude);
  }

  next();
};