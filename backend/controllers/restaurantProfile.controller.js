
import * as service from "../services/restaurantProfile.service.js";

import {
  uploadRegistrationDocument,
  uploadRegistrationImage
} from "../services/restaurantRegistration.service.js";

import supabase from "../config/supabase.js";

const BUCKET = "restaurant-registration-documents";

// Common controller wrapper
const handle = (fn) => async (req, res, next) => {
  try {
    const data = await fn(req);

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// Create a validation error
const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

// Parse an array of strings from multipart/form-data.
// Accepts JSON arrays or comma-separated values.
const parseStringArray = (value, field) => {
  if (Array.isArray(value)) {
    if (!value.every((item) => typeof item === "string")) {
      throw badRequest(`${field} must contain only strings`);
    }

    return value;
  }

  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string or array`);
  }

  const trimmed = value.trim();

  if (!trimmed) return undefined;

  if (trimmed.startsWith("[")) {
    let parsed;

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw badRequest(
        `${field} must be a valid JSON array or comma-separated list`
      );
    }

    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => typeof item === "string")
    ) {
      throw badRequest(`${field} must be an array of strings`);
    }

    return parsed;
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

// Parse JSON object from multipart/form-data
const parseJsonObject = (value, field) => {
  if (typeof value === "string") {
    if (!value.trim()) return undefined;

    try {
      value = JSON.parse(value);
    } catch {
      throw badRequest(`${field} must contain valid JSON`);
    }
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw badRequest(`${field} must be a JSON object`);
  }

  return value;
};

// -------------------------------
// RESTAURANT APIs
// -------------------------------

// GET /restaurant/profile
export const getProfile = handle((req) =>
  service.getProfile(req.user.restaurant_id)
);

// PATCH /restaurant/profile
export const editProfile = async (req, res, next) => {
  const uploadedPaths = [];

  try {
    const restaurantId = req.user?.restaurant_id;

    if (!restaurantId) {
      const error = new Error(
        "Restaurant ID missing from authentication"
      );
      error.statusCode = 401;
      throw error;
    }

    const body = { ...req.body };

    // Uploaded file fields must come from req.files.
    const fileFields = [
      "logo",
      "cover",
      "fssai",
      "business_proof"
    ];

    for (const field of fileFields) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) {
        continue;
      }

      const value = body[field];

      // Swagger sometimes sends empty file placeholders.
      if (
        value === "" ||
        value === null ||
        value === undefined
      ) {
        delete body[field];
      } else {
        throw badRequest(
          `${field} must be uploaded using Choose File`
        );
      }
    }

    // Only these text fields can be edited directly.
    const allowedFields = new Set([
      "cuisines",
      "restaurant_contact",
      "food_served",
      "opening_hours"
    ]);

    for (const field of Object.keys(body)) {
      if (!allowedFields.has(field)) {
        throw badRequest(`Field not allowed: ${field}`);
      }
    }

    // Parse cuisines
    if (body.cuisines !== undefined) {
      const parsed = parseStringArray(
        body.cuisines,
        "cuisines"
      );

      if (parsed === undefined) {
        delete body.cuisines;
      } else {
        body.cuisines = parsed;
      }
    }

    // Parse food_served
    if (body.food_served !== undefined) {
      const parsed = parseStringArray(
        body.food_served,
        "food_served"
      );

      if (parsed === undefined) {
        delete body.food_served;
      } else {
        body.food_served = parsed;
      }
    }

    // Parse opening_hours
    if (body.opening_hours !== undefined) {
      const parsed = parseJsonObject(
        body.opening_hours,
        "opening_hours"
      );

      if (parsed === undefined) {
        delete body.opening_hours;
      } else {
        body.opening_hours = parsed;
      }
    }

    // Ignore an empty contact field from Swagger.
    if (body.restaurant_contact !== undefined) {
      if (
        typeof body.restaurant_contact !== "string"
      ) {
        throw badRequest(
          "restaurant_contact must be a string"
        );
      }

      body.restaurant_contact =
        body.restaurant_contact.trim();

      if (!body.restaurant_contact) {
        delete body.restaurant_contact;
      }
    }

    // Uploaded files
    const files = req.files || {};

    const uploads = [
      ["logo", uploadRegistrationImage],
      ["cover", uploadRegistrationImage],
      ["fssai", uploadRegistrationDocument],
      ["business_proof", uploadRegistrationDocument]
    ];

    // Check for a request with no changes.
    const hasFiles = uploads.some(
      ([field]) => files[field]?.length > 0
    );

    if (!hasFiles && Object.keys(body).length === 0) {
      throw badRequest(
        "Provide at least one profile field or file"
      );
    }

    // Upload documents/images to Supabase.
    for (const [field, uploadFunction] of uploads) {
      const file = files[field]?.[0];

      if (!file) continue;

      const result = await uploadFunction(
        restaurantId,
        field,
        file
      );

      // These helpers must return a storage path string.
      if (typeof result !== "string" || !result.trim()) {
        throw new Error(
          `${field} upload did not return a valid storage path`
        );
      }

      body[field] = result;
      uploadedPaths.push(result);
    }

    // Update restaurant database record.
    const updated = await service.editProfile(
      restaurantId,
      body
    );

    return res.status(200).json({
      success: true,
      message: "Restaurant profile updated successfully",
      data: updated
    });

  } catch (error) {
    // Remove newly uploaded files if a later step fails.
    if (uploadedPaths.length > 0) {
      try {
        const { error: cleanupError } =
          await supabase.storage
            .from(BUCKET)
            .remove(uploadedPaths);

        if (cleanupError) {
          console.error(
            "Supabase cleanup failed:",
            cleanupError.message
          );
        }
      } catch (cleanupError) {
        console.error(
          "Unexpected cleanup error:",
          cleanupError
        );
      }
    }

    next(error);
  }
};

// PUT /restaurant/profile/bank-account
export const replaceBank = async (req, res, next) => {
  let uploadedPath = null;

  try {
    const restaurantId = req.user?.restaurant_id;

    if (!restaurantId) {
      const error = new Error("Restaurant ID missing");
      error.statusCode = 401;
      throw error;
    }

    const {
      account_holder_name,
      account_number,
      ifsc,
      bank_name
    } = req.body;

    const fields = {
      account_holder_name,
      account_number,
      ifsc,
      bank_name
    };

    if (
      Object.values(fields).some(
        value => typeof value !== "string" || !value.trim()
      )
    ) {
      const error = new Error("All bank account fields are required");
      error.statusCode = 400;
      throw error;
    }

    // Do not accept a bank proof ID supplied by the client.
    if (req.body.bank_proof_id !== undefined) {
      const error = new Error("Upload bank_proof as a file");
      error.statusCode = 400;
      throw error;
    }

    if (!req.file) {
      const error = new Error("Bank proof file is required");
      error.statusCode = 400;
      throw error;
    }

    uploadedPath = await uploadRegistrationDocument(
      restaurantId,
      "bank_proof",
      req.file
    );

    const updated = await service.replaceBank(
      restaurantId,
      {
        ...fields,
        bank_proof_id: uploadedPath
      }
    );

    return res.status(200).json({
      success: true,
      message: "Bank account updated successfully",
      data: updated
    });
  } catch (error) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from("restaurant-registration-documents")
        .remove([uploadedPath]);

      if (cleanupError) {
        console.error("Bank proof cleanup failed:", cleanupError);
      }
    }

    next(error);
  }
};

// POST /restaurant/profile/change-requests

export const createRequest = async (req, res, next) => {
  const uploadedPaths = [];

  try {
    const restaurantId = req.user?.restaurant_id;
    const userId = req.user?.id;

    if (!restaurantId || !userId) {
      const error = new Error("Authentication details missing");
      error.statusCode = 401;
      throw error;
    }

    const allowedFields = new Set([
    "rest_name",
    "owner_name",
    "restaurant_type",
    "lat",
    "lon",
    "city",
    "state",
    "pincode",
    "landmark",
    "house_no",
    "gst",
    "pan_number",
    "aadhaar_number"
  ]);

  const requestedChanges = {};
  const locationNumberFields = new Set(["lat", "lon"]);

  for (const [field, value] of Object.entries(req.body || {})) {
      if (
        field === "pan_card" ||
        field === "adhaar_card" ||
        field === "gst_document"
      ) {
        // Ignore empty placeholders from Swagger.
        if (value === "" || value === null) continue;

        const error = new Error(
          `${field} must be uploaded as a file`
        );
        error.statusCode = 400;
        throw error;
      }

      if (!allowedFields.has(field)) {
        const error = new Error(`Field not allowed: ${field}`);
        error.statusCode = 400;
        throw error;
      }

      if (locationNumberFields.has(field)) {
        if (typeof value !== "string" || !value.trim()) {
          continue;
        }

        const coordinate = Number(value);
        if (!Number.isFinite(coordinate)) {
          const error = new Error(
            `${field} must be a valid number`
          );
          error.statusCode = 400;
          throw error;
        }

        requestedChanges[field] = coordinate;
        continue;
      }

      if (typeof value === "string" && value.trim()) {
        requestedChanges[field] =
          field === "restaurant_type"
            ? value.trim().toLowerCase()
            : value.trim();
      }
    }

    const files = req.files || {};

    const documentFields = [
      "pan_card",
      "adhaar_card",
      "gst_document"
    ];

    for (const field of documentFields) {
      const file = files[field]?.[0];

      if (!file) continue;

      const path = await uploadRegistrationDocument(
        restaurantId,
        field,
        file
      );

      if (typeof path !== "string" || !path.trim()) {
        throw new Error(
          `${field} upload did not return a storage path`
        );
      }

      requestedChanges[field] = path;
      uploadedPaths.push(path);
    }

    if (Object.keys(requestedChanges).length === 0) {
      const error = new Error(
        "Provide at least one field or document to change"
      );
      error.statusCode = 400;
      throw error;
    }
    
    if (requestedChanges.pan_number !== undefined) {
  requestedChanges.pan_number =
    requestedChanges.pan_number.toUpperCase();

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(requestedChanges.pan_number)) {
    const error = new Error("Invalid PAN number");
    error.statusCode = 400;
    throw error;
  }
}

if (requestedChanges.aadhaar_number !== undefined) {
  if (!/^[0-9]{12}$/.test(requestedChanges.aadhaar_number)) {
    const error = new Error("Aadhaar number must contain 12 digits");
    error.statusCode = 400;
    throw error;
  }
}


    const data = await service.createRequest(
      restaurantId,
      userId,
      requestedChanges
    );

    return res.status(201).json({
      success: true,
      message: "Profile change request submitted for admin approval",
      data
    });
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        const { error: cleanupError } = await supabase.storage
          .from("restaurant-registration-documents")
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error(
            "Change request upload cleanup failed:",
            cleanupError
          );
        }
      } catch (cleanupError) {
        console.error(
          "Unexpected cleanup error:",
          cleanupError
        );
      }
    }

    next(error);
  }
};


// GET /restaurant/profile/change-requests
export const listOwn = handle((req) =>
  service.listOwn(req.user.restaurant_id)
);

// -------------------------------
// ADMIN APIs
// -------------------------------

// GET /admin/restaurant-profile-requests
export const listAdmin = handle((req) =>
  service.listAdmin(req.query.status)
);

// GET /admin/restaurant-profile-requests/:id
export const getRequest = handle((req) =>
  service.getRequest(req.params.id)
);

// PATCH /admin/restaurant-profile-requests/:id/approve
export const approve = handle((req) =>
  service.decideRequest(
    req.params.id,
    req.user.id,
    true
  )
);

// PATCH /admin/restaurant-profile-requests/:id/reject
export const reject = handle((req) =>
  service.decideRequest(
    req.params.id,
    req.user.id,
    false,
    req.body?.rejection_reason
  )
);
