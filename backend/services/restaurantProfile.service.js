
import pool from "../config/database.js";
import {
  generateSignedUrl,
  StorageObjectNotFoundError
} from "./storage.service.js";

// ==========================================
// FIELD MAPPINGS
// ==========================================

export const directFields = {
  logo: "logo_id",
  cover: "cover_id",
  cuisines: "cuisines",
  restaurant_contact: "restaurant_contact",
  food_served: "food_served",
  fssai: "fssai_document_id",
  business_proof: "business_proof_document_id",
  opening_hours: "operating_hours"
};

export const approvalFields = {
  rest_name: "name",
  owner_name: "owner_name",
  restaurant_type: "restaurant_type",
  lat: "latitude",
  lon: "longitude",
  city: "city",
  state: "state",
  pincode: "pincode",
  landmark: "landmark",
  house_no: "house_no",
  gst: "gstin",
  pan_number: "pan",
  aadhaar_number: "aadhaar_number",
  pan_card: "pan_document_id",
  adhaar_card: "aadhaar_document_id",
  gst_document: "gst_document_id"
};

const bankFields = [
  "account_holder_name",
  "account_number",
  "ifsc",
  "bank_name",
  "bank_proof_id"
];

const jsonFields = new Set([
  "cuisines",
  "food_served",
  "operating_hours"
]);

const restaurantTypes = new Set([
  "restaurant",
  "cloud_kitchen"
]);

const documentFields = new Set([
  "logo",
  "cover",
  "fssai",
  "business_proof",
  "pan_card",
  "adhaar_card",
  "bank_proof_id"
]);

const sensitiveFields = new Set([
  "aadhaar_number",
  "pan",
  "password_hash",
  "bank_account_number"
]);

const PROFILE_FILE_FIELDS = {
  logo_id: "logo_url",
  cover_id: "cover_url",
  fssai_document_id: "fssai_document_url",
  business_proof_document_id: "business_proof_document_url",
  pan_document_id: "pan_document_url",
  aadhaar_document_id: "aadhaar_document_url",
  gst_document_id: "gst_document_url",
  bank_proof_id: "bank_proof_url"
};

const PROFILE_FILE_BUCKET =
  "restaurant-registration-documents";

// ==========================================
// ERROR HELPERS
// ==========================================

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  throw error;
};

const isObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const validUuid = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );

// ==========================================
// VALIDATION
// ==========================================

function checkPayload(body, mapping) {
  if (!isObject(body) || Object.keys(body).length === 0) {
    fail(400, "At least one field is required");
  }

  for (const [field, value] of Object.entries(body)) {
    if (!Object.hasOwn(mapping, field)) {
      fail(400, `Field not allowed: ${field}`);
    }

    if (value === undefined || value === null) {
      fail(400, `Field ${field} cannot be null`);
    }

    const dbColumn = mapping[field];

    if (jsonFields.has(dbColumn)) {
      if (!Array.isArray(value) && !isObject(value)) {
        fail(
          400,
          `${field} must be a JSON array or object`
        );
      }

      continue;
    }

    if (field === "lat" || field === "lon") {
      const limit = field === "lat" ? 90 : 180;
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < -limit ||
        value > limit
      ) {
        fail(
          400,
          `${field} must be a valid coordinate between -${limit} and ${limit}`
        );
      }

      continue;
    }

    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.length > 2048
    ) {
      fail(400, `Invalid value for ${field}`);
    }

    if (
      field === "pincode" &&
      !/^[1-9][0-9]{5}$/.test(value.trim())
    ) {
      fail(400, "pincode must be a valid 6-digit Indian pincode");
    }

    if (
      field === "restaurant_type" &&
      !restaurantTypes.has(value.trim().toLowerCase())
    ) {
      fail(
        400,
        "restaurant_type must be either restaurant or cloud_kitchen"
      );
    }

    if (
      documentFields.has(field) &&
      value.trim().length === 0
    ) {
      fail(400, `Invalid document reference for ${field}`);
    }
  }
}

// ==========================================
// RESPONSE SANITIZATION
// ==========================================

function publicProfile(row) {
  if (!row) return row;

  const result = {};

  for (const [key, value] of Object.entries(row)) {
    if (sensitiveFields.has(key)) {
      continue;
    }

    if (key === "account_number") {
      result.account_number = value
        ? `****${String(value).slice(-4)}`
        : null;

      continue;
    }

    result[key] = value;
  }

  return result;
}

// ==========================================
// DATABASE HELPERS
// ==========================================

const SELECT_RESTAURANT = `
  SELECT *
  FROM public.restaurants
  WHERE restaurant_id = $1
`;

async function getRestaurant(client, restaurantId, lock = false) {
  const query = lock
    ? `${SELECT_RESTAURANT} FOR UPDATE`
    : SELECT_RESTAURANT;

  const result = await client.query(query, [
    restaurantId
  ]);

  if (result.rowCount === 0) {
    fail(404, "Restaurant not found");
  }

  return result.rows[0];
}

async function transaction(work) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await work(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function updateFields(
  client,
  restaurantId,
  body,
  mapping
) {
  const fields = Object.keys(body);

  if (fields.length === 0) {
    fail(400, "No fields provided for update");
  }

  const columns = fields.map(
    (field) => mapping[field]
  );

  const values = fields.map((field) => {
    const column = mapping[field];

    return jsonFields.has(column)
      ? JSON.stringify(body[field])
      : body[field];
  });

  const assignments = columns.map(
    (column, index) => {
      const placeholder = `$${index + 1}`;

      return jsonFields.has(column)
        ? `"${column}" = ${placeholder}::jsonb`
        : `"${column}" = ${placeholder}`;
    }
  );

  const query = `
    UPDATE public.restaurants
    SET
      ${assignments.join(", ")},
      updated_at = NOW()
    WHERE restaurant_id = $${fields.length + 1}
    RETURNING *
  `;

  const result = await client.query(query, [
    ...values,
    restaurantId
  ]);

  if (result.rowCount === 0) {
    fail(404, "Restaurant not found");
  }

  return publicProfile(result.rows[0]);
}

// ==========================================
// 1. GET RESTAURANT PROFILE
// ==========================================

export async function getProfile(restaurantId) {
  const restaurant = await getRestaurant(
    pool,
    restaurantId
  );

  const profile = publicProfile(restaurant);

  await Promise.all(
    Object.entries(PROFILE_FILE_FIELDS).map(
      async ([storageField, urlField]) => {
        const filePath = profile[storageField];

        if (!filePath) {
          profile[urlField] = null;
          return;
        }

        try {
          profile[urlField] = await generateSignedUrl(
            PROFILE_FILE_BUCKET,
            filePath
          );
        } catch (error) {
          if (!(error instanceof StorageObjectNotFoundError)) {
            throw error;
          }

          console.warn(
            `Restaurant profile file not found in storage: ${storageField}`,
            { restaurantId }
          );
          profile[urlField] = null;
        }
      }
    )
  );

  delete profile.logo_id;
  delete profile.cover_id;

  return profile;
}

// ==========================================
// 2. EDIT DIRECT PROFILE FIELDS
// ==========================================

export async function editProfile(restaurantId, body) {
  checkPayload(body, directFields);

  return transaction(async (client) => {
    await getRestaurant(
      client,
      restaurantId,
      true
    );

    return updateFields(
      client,
      restaurantId,
      body,
      directFields
    );
  });
}

// ==========================================
// 3. REPLACE BANK ACCOUNT
// ==========================================

export async function replaceBank(restaurantId, body) {
  if (!isObject(body)) {
    fail(400, "Invalid bank account data");
  }

  const providedFields = Object.keys(body);

  if (
    providedFields.length !== bankFields.length ||
    !bankFields.every(
      (field) =>
        typeof body[field] === "string" &&
        body[field].trim()
    )
  ) {
    fail(
      400,
      `Provide all bank fields: ${bankFields.join(", ")}`
    );
  }

  const accountHolderName =
    body.account_holder_name.trim();

  const accountNumber =
    body.account_number.trim();

  const ifsc =
    body.ifsc.trim().toUpperCase();

  const bankName =
    body.bank_name.trim();

  const bankProofId =
    body.bank_proof_id.trim();

  // IFSC: 4 letters + 0 + 6 alphanumeric characters
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    fail(
      400,
      "Invalid IFSC. Example format: HDFC0001234"
    );
  }

  // Indian bank account numbers are typically 6–20 digits.
  if (!/^\d{6,20}$/.test(accountNumber)) {
    fail(
      400,
      "Invalid account number. Use 6 to 20 digits"
    );
  }

  const bankData = {
    account_holder_name: accountHolderName,
    account_number: accountNumber,
    ifsc,
    bank_name: bankName,
    bank_proof_id: bankProofId
  };

  return transaction(async (client) => {
    await getRestaurant(
      client,
      restaurantId,
      true
    );

    const mapping = Object.fromEntries(
      bankFields.map((field) => [field, field])
    );

    return updateFields(
      client,
      restaurantId,
      bankData,
      mapping
    );
  });
}

// ==========================================
// 4. CREATE PROFILE CHANGE REQUEST
// ==========================================

export async function createRequest(
  restaurantId,
  userId,
  changes
) {
  checkPayload(changes, approvalFields);

  if (!userId) {
    fail(401, "User ID missing");
  }

  return transaction(async (client) => {
    const restaurant = await getRestaurant(
      client,
      restaurantId,
      true
    );

    // Only one pending request per restaurant.
    const existing = await client.query(
      `
      SELECT 1
      FROM public.restaurant_profile_change_requests
      WHERE restaurant_id = $1
        AND request_type = 'profile_change'
        AND status = 'pending'
      LIMIT 1
      `,
      [restaurantId]
    );

    if (existing.rowCount > 0) {
      fail(
        409,
        "A pending change request already exists"
      );
    }

    // Capture current values for conflict detection.
    const previousValues = {};

    for (const field of Object.keys(changes)) {
      const dbColumn = approvalFields[field];

      previousValues[field] =
        restaurant[dbColumn];
    }

    const result = await client.query(
      `
      INSERT INTO public.restaurant_profile_change_requests (
        restaurant_id,
        restaurant_record_id,
        requested_by,
        requested_changes,
        previous_values,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::jsonb,
        $5::jsonb,
        'pending'
      )
      RETURNING *
      `,
      [
        restaurantId,
        restaurant.id,
        userId,
        JSON.stringify(changes),
        JSON.stringify(previousValues)
      ]
    );

    return result.rows[0];
  });
}

// ==========================================
// 5. LIST OWN CHANGE REQUESTS
// ==========================================

export async function listOwn(restaurantId) {
  const result = await pool.query(
    `
    SELECT *
    FROM public.restaurant_profile_change_requests
    WHERE restaurant_id = $1
      AND request_type = 'profile_change'
    ORDER BY created_at DESC
    `,
    [restaurantId]
  );

  return result.rows;
}

// ==========================================
// 6. ADMIN - LIST CHANGE REQUESTS
// ==========================================

export async function listAdmin(status) {
  const allowedStatuses = [
    "pending",
    "approved",
    "rejected"
  ];

  if (
    status &&
    !allowedStatuses.includes(status)
  ) {
    fail(400, "Invalid status");
  }

  const query = status
    ? `
      SELECT *
      FROM public.restaurant_profile_change_requests
      WHERE request_type = 'profile_change'
        AND status = $1
      ORDER BY created_at DESC
      LIMIT 100
    `
    : `
      SELECT *
      FROM public.restaurant_profile_change_requests
      WHERE request_type = 'profile_change'
      ORDER BY created_at DESC
      LIMIT 100
    `;

  const result = await pool.query(
    query,
    status ? [status] : []
  );

  return result.rows;
}

// ==========================================
// 7. ADMIN - GET CHANGE REQUEST
// ==========================================

export async function getRequest(requestId) {
  if (!validUuid(requestId)) {
    fail(400, "Invalid request ID");
  }

  const result = await pool.query(
    `
    SELECT *
    FROM public.restaurant_profile_change_requests
    WHERE id = $1
      AND request_type = 'profile_change'
    `,
    [requestId]
  );

  if (result.rowCount === 0) {
    fail(404, "Request not found");
  }

  return result.rows[0];
}

// ==========================================
// 8 & 9. ADMIN - APPROVE / REJECT REQUEST
// ==========================================

export async function decideRequest(
  requestId,
  adminId,
  approve,
  reason
) {
  if (!validUuid(requestId)) {
    fail(400, "Invalid request ID");
  }

  if (!adminId) {
    fail(401, "Admin ID missing");
  }

  if (
    !approve &&
    (
      typeof reason !== "string" ||
      !reason.trim()
    )
  ) {
    fail(400, "Rejection reason required");
  }

  return transaction(async (client) => {
    // Lock the request to prevent concurrent reviews.
    const result = await client.query(
      `
      SELECT *
      FROM public.restaurant_profile_change_requests
      WHERE id = $1
        AND request_type = 'profile_change'
      FOR UPDATE
      `,
      [requestId]
    );

    if (result.rowCount === 0) {
      fail(404, "Request not found");
    }

    const request = result.rows[0];

    if (request.status !== "pending") {
      fail(409, "Request already reviewed");
    }

    // Lock the restaurant record.
    const restaurant = await getRestaurant(
      client,
      request.restaurant_id,
      true
    );

    if (approve) {
      checkPayload(
        request.requested_changes,
        approvalFields
      );

      // Prevent approving stale changes.
      for (
        const [field, previousValue]
        of Object.entries(request.previous_values)
      ) {
        const dbColumn = approvalFields[field];

        if (
          JSON.stringify(restaurant[dbColumn]) !==
          JSON.stringify(previousValue)
        ) {
          fail(
            409,
            `Restaurant field ${field} changed since submission`
          );
        }
      }

      // Apply approved fields only.
      await updateFields(
        client,
        request.restaurant_id,
        request.requested_changes,
        approvalFields
      );
    }

    const updatedRequest = await client.query(
      `
      UPDATE public.restaurant_profile_change_requests
      SET
        status = $2,
        reviewed_by = $3,
        reviewed_at = NOW(),
        rejection_reason = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        requestId,
        approve ? "approved" : "rejected",
        adminId,
        approve ? null : reason.trim()
      ]
    );

    return updatedRequest.rows[0];
  });
}
