import { validate as isUuid } from "uuid";

const ALLOWED_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED"
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

const validateDate = (value, fieldName) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return `${fieldName} must be in YYYY-MM-DD format`;
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return `${fieldName} is invalid`;
  }

  return null;
};

const validateNonNegativeInteger = (
  value,
  fieldName
) => {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    return `${fieldName} must be a non-negative integer`;
  }

  return null;
};

const validateAmount = (
  value,
  fieldName,
  required = false
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return required
      ? `${fieldName} is required`
      : null;
  }

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    return `${fieldName} must be a non-negative integer`;
  }

  return null;
};

const normalizeStatus = (status) =>
  status?.toUpperCase();

// GET /orders
export const validateOrderList = (
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
        message: "Invalid order status"
      });
    }

    req.query.status = normalizedStatus;
  }

  req.query.page = pageNumber;
  req.query.limit = limitNumber;

  next();
};

// Validate order UUID
export const validateOrderId = (
  req,
  res,
  next
) => {
  const { id } = req.params;

  if (!isUuid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID"
    });
  }

  next();
};

// Validate customer UUID in route
export const validateOrderCustomerId = (
  req,
  res,
  next
) => {
  const { customerUserId } = req.params;

  if (!isUuid(customerUserId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer user ID"
    });
  }

  next();
};

// Validate POST /orders
export const validateCreateOrder = (
  req,
  res,
  next
) => {
  const {
    customer_user_id,
    train_id,
    journey_date,
    boarding_station_id,
    coach,
    seat,
    pnr,
    queue_time_minutes,
    delivery_deadline,
    is_deliverable,
    status,
    subtotal,
    tax,
    packaging_fee,
    delivery_fee,
    total,
    customer_note,
    discount,
    restaurant_station_service_id,
    idempotency_key,
    delivery_train_stop_id
  } = req.body;

  // Required UUIDs
  if (
    !customer_user_id ||
    !isUuid(customer_user_id)
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid customer_user_id is required"
    });
  }

  if (
    !train_id ||
    !isUuid(train_id)
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid train_id is required"
    });
  }

  if (
    !boarding_station_id ||
    !isUuid(boarding_station_id)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid boarding_station_id is required"
    });
  }

  if (
    !restaurant_station_service_id ||
    !isUuid(restaurant_station_service_id)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Valid restaurant_station_service_id is required"
    });
  }

  // Optional UUID
  if (
    delivery_train_stop_id !== undefined &&
    delivery_train_stop_id !== null &&
    !isUuid(delivery_train_stop_id)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "delivery_train_stop_id must be a valid UUID"
    });
  }

  // Journey date
  if (!journey_date) {
    return res.status(400).json({
      success: false,
      message: "journey_date is required"
    });
  }

  const journeyDateError =
    validateDate(
      journey_date,
      "journey_date"
    );

  if (journeyDateError) {
    return res.status(400).json({
      success: false,
      message: journeyDateError
    });
  }

  // Deliverability
  if (
    typeof is_deliverable !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "is_deliverable must be a boolean"
    });
  }

  // Amounts
  let error = validateAmount(
    subtotal,
    "subtotal",
    true
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    total,
    "total",
    true
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    tax,
    "tax"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    packaging_fee,
    "packaging_fee"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    delivery_fee,
    "delivery_fee"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    discount,
    "discount"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  // Queue time
  if (
    queue_time_minutes !== undefined &&
    queue_time_minutes !== null
  ) {
    error = validateNonNegativeInteger(
      queue_time_minutes,
      "queue_time_minutes"
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }
  }

  // Optional strings
  error = validateOptionalString(
    coach,
    "coach",
    50
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    seat,
    "seat",
    50
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    pnr,
    "pnr",
    20
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    customer_note,
    "customer_note",
    1000
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    idempotency_key,
    "idempotency_key",
    255
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  // Status
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
        message: "Invalid order status"
      });
    }

    req.body.status = normalizedStatus;
  }

  // Delivery deadline
  if (
    delivery_deadline !== undefined &&
    delivery_deadline !== null
  ) {
    if (
      typeof delivery_deadline !== "string" ||
      Number.isNaN(
        new Date(delivery_deadline).getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "delivery_deadline must be a valid timestamp"
      });
    }
  }

  // Normalize strings
  if (coach) {
    req.body.coach = coach.trim();
  }

  if (seat) {
    req.body.seat = seat.trim();
  }

  if (pnr) {
    req.body.pnr = pnr.trim().toUpperCase();
  }

  if (customer_note) {
    req.body.customer_note =
      customer_note.trim();
  }

  if (idempotency_key) {
    req.body.idempotency_key =
      idempotency_key.trim();
  }

  next();
};

// Validate PUT /orders/:id
export const validateUpdateOrder = (
  req,
  res,
  next
) => {
  const allowedFields = [
    "coach",
    "seat",
    "pnr",
    "queue_time_minutes",
    "delivery_deadline",
    "is_deliverable",
    "status",
    "subtotal",
    "tax",
    "packaging_fee",
    "delivery_fee",
    "total",
    "customer_note",
    "discount",
    "restaurant_station_service_id",
    "delivery_train_stop_id"
  ];

  const providedFields =
    Object.keys(req.body);

  if (providedFields.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "At least one field is required for update"
    });
  }

  const invalidFields =
    providedFields.filter(
      (field) =>
        !allowedFields.includes(field)
    );

  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid fields: ${invalidFields.join(", ")}`
    });
  }

  const {
    coach,
    seat,
    pnr,
    queue_time_minutes,
    delivery_deadline,
    is_deliverable,
    status,
    subtotal,
    tax,
    packaging_fee,
    delivery_fee,
    total,
    customer_note,
    discount,
    restaurant_station_service_id,
    delivery_train_stop_id
  } = req.body;

  let error;

  if (
    queue_time_minutes !== undefined &&
    queue_time_minutes !== null
  ) {
    error = validateNonNegativeInteger(
      queue_time_minutes,
      "queue_time_minutes"
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error
      });
    }
  }

  if (
    is_deliverable !== undefined &&
    typeof is_deliverable !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "is_deliverable must be a boolean"
    });
  }

  error = validateAmount(
    subtotal,
    "subtotal"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    total,
    "total"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    tax,
    "tax"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    packaging_fee,
    "packaging_fee"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    delivery_fee,
    "delivery_fee"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateAmount(
    discount,
    "discount"
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  if (
    restaurant_station_service_id !== undefined &&
    restaurant_station_service_id !== null &&
    !isUuid(restaurant_station_service_id)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "restaurant_station_service_id must be a valid UUID"
    });
  }

  if (
    delivery_train_stop_id !== undefined &&
    delivery_train_stop_id !== null &&
    !isUuid(delivery_train_stop_id)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "delivery_train_stop_id must be a valid UUID"
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
        message: "Invalid order status"
      });
    }

    req.body.status = normalizedStatus;
  }

  if (
    delivery_deadline !== undefined &&
    delivery_deadline !== null
  ) {
    if (
      typeof delivery_deadline !== "string" ||
      Number.isNaN(
        new Date(delivery_deadline).getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "delivery_deadline must be a valid timestamp"
      });
    }
  }

  error = validateOptionalString(
    coach,
    "coach",
    50
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    seat,
    "seat",
    50
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    pnr,
    "pnr",
    20
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  error = validateOptionalString(
    customer_note,
    "customer_note",
    1000
  );

  if (error) {
    return res.status(400).json({
      success: false,
      message: error
    });
  }

  if (coach) {
    req.body.coach = coach.trim();
  }

  if (seat) {
    req.body.seat = seat.trim();
  }

  if (pnr) {
    req.body.pnr = pnr.trim().toUpperCase();
  }

  if (customer_note) {
    req.body.customer_note =
      customer_note.trim();
  }

  next();
};

// Validate PATCH /orders/:id/status
export const validateOrderStatus = (
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
      message: "Invalid order status"
    });
  }

  req.body.status = normalizedStatus;

  next();
};