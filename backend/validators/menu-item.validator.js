import { validate as isUuid } from "uuid";

const STRING_FIELDS = {
  name: 255,
  description: null,
  category: 255,
  sub_category: 255,
  qty_type: 255,
  admin_item_inactive_reason: null
};

const INTEGER_FIELDS = [
  "price",
  "preparation_time_minutes",
  "quantity",
  "low_stock_threshold",
  "discounted_price"
];

const BOOLEAN_FIELDS = [
  "owner_is_available",
  "admin_is_available"
];

const validateId = (req, res, next) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid menu item ID"
    });
  }

  next();
};

const validateMenuItem = (req, res, next, isPatch) => {
  const data = req.body;

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return res.status(400).json({
      success: false,
      message: "Request body must be a JSON object"
    });
  }

  const allowedFields = [
    ...Object.keys(STRING_FIELDS),
    ...INTEGER_FIELDS,
    "tax_rate",
    ...BOOLEAN_FIELDS,
    "food_served",
    "addons"
  ];
  const unknownField = Object.keys(data).find(
    (field) => !allowedFields.includes(field)
  );

  if (unknownField) {
    return res.status(400).json({
      success: false,
      message: `Unknown menu item field: ${unknownField}`
    });
  }

  if (!isPatch) {
    for (const field of [
      "name",
      "price",
      "preparation_time_minutes"
    ]) {
      if (data[field] === undefined || data[field] === null) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }
  } else if (
    Object.keys(data).length === 0 &&
    (!Array.isArray(req.files) || req.files.length === 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "At least one menu item field is required"
    });
  }

  for (const [field, maxLength] of Object.entries(STRING_FIELDS)) {
    const value = data[field];

    if (value === undefined || value === null) {
      if (field === "name" && value === null) {
        return res.status(400).json({
          success: false,
          message: "name cannot be null"
        });
      }
      continue;
    }

    if (typeof value !== "string") {
      return res.status(400).json({
        success: false,
        message: `${field} must be a string`
      });
    }

    if (field === "name" && value.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "name cannot be empty"
      });
    }

    if (field === "name") {
      data.name = value.trim();
    }

    if (field === "category" || field === "sub_category") {
      data[field] = value.trim();
    }

    if (field === "qty_type") {
      data[field] = value.trim();
    }

    if (maxLength !== null && value.length > maxLength) {
      return res.status(400).json({
        success: false,
        message: `${field} must not exceed ${maxLength} characters`
      });
    }
  }

  for (const field of INTEGER_FIELDS) {
    const value = data[field];
    if (value === undefined) continue;
    if (value === null && field === "discounted_price") continue;

    if (field === "preparation_time_minutes" && value < 1) {
      return res.status(400).json({
        success: false,
        message: "preparation_time_minutes must be a positive integer"
      });
    }

    if (!Number.isInteger(value) || value < 0) {
      return res.status(400).json({
        success: false,
        message: `${field} must be a non-negative integer`
      });
    }
  }

  if (
    data.tax_rate !== undefined &&
    (typeof data.tax_rate !== "number" ||
      !Number.isFinite(data.tax_rate) ||
      data.tax_rate < 0)
  ) {
    return res.status(400).json({
      success: false,
      message: "tax_rate must be a non-negative number"
    });
  }

  for (const field of [
    "price",
    "preparation_time_minutes",
    "quantity",
    "low_stock_threshold",
    "tax_rate"
  ]) {
    if (data[field] === null) {
      return res.status(400).json({
        success: false,
        message: `${field} cannot be null`
      });
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    if (
      data[field] !== undefined &&
      (data[field] === null && field === "owner_is_available")
    ) {
      return res.status(400).json({
        success: false,
        message: `${field} cannot be null`
      });
    }

    if (
      data[field] !== undefined &&
      data[field] !== null &&
      typeof data[field] !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: `${field} must be a boolean`
      });
    }
  }

  if (data.food_served !== undefined && data.food_served !== null) {
    const foodServed = Array.isArray(data.food_served)
      ? data.food_served
      : [data.food_served];

    if (
      foodServed.length !== 1 ||
      typeof foodServed[0] !== "string" ||
      !["veg", "non_veg", "egg"].includes(
        foodServed[0].toLowerCase()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "food_served must be one of veg, non_veg, or egg"
      });
    }

    data.food_served = foodServed[0].toLowerCase();
  }

  if (
    data.addons !== undefined &&
    !Array.isArray(data.addons)
  ) {
    return res.status(400).json({
      success: false,
      message: "addons must be a JSON array"
    });
  }

  next();
};

export const validateMenuItemId = validateId;

export const validateRestaurantMenuItemsQuery = (
  req,
  res,
  next
) => {
  const { restaurant_id: restaurantId } = req.query;

  if (
    typeof restaurantId !== "string" ||
    !isUuid(restaurantId)
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid restaurant_id query parameter is required"
    });
  }

  if (
    restaurantId.toLowerCase() !==
    req.user?.restaurant_id?.toLowerCase()
  ) {
    return res.status(403).json({
      success: false,
      message: "You can only view menu items for your restaurant"
    });
  }

  req.query.restaurant_id = restaurantId.toLowerCase();
  next();
};

export const validateCreateMenuItem = (req, res, next) =>
  validateMenuItem(req, res, next, false);

export const validateUpdateMenuItem = (req, res, next) =>
  validateMenuItem(req, res, next, true);
