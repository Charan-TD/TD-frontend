import pool from "../config/database.js";

/**
 * Creates the initial restaurant registration.
 *
 * Only restaurant-details fields are created here.
 * Remaining registration sections are saved through
 * updateRegistrationSection().
 */
export const createRegistration = async (data) => {
  const {
    name,
    owner_name,
    owner_mobile,
    restaurant_type,
    restaurant_email,
    restaurant_contact,
    password_hash,
    logo_id,
    cover_id,
    cuisines,
    food_served
  } = data;

  const query = `
    INSERT INTO public.restaurants (
      name,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      password_hash,
      logo_id,
      cover_id,
      cuisines,
      food_served,
      admin_restaurant_status
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10::jsonb,
      $11::jsonb,
      'INACTIVE'
    )
    RETURNING
      id,
      name,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      logo_id,
      cover_id,
      cuisines,
      food_served,
      admin_restaurant_status AS status,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [
    name,
    owner_name,
    owner_mobile,
    restaurant_type,
    restaurant_email,
    restaurant_contact,
    password_hash,
    logo_id,
    cover_id,
    JSON.stringify(cuisines),
    JSON.stringify(food_served)
  ]);

  return result.rows[0] || null;
};


/**
 * Finds a restaurant registration by ID.
 */
export const findRegistrationById = async (registrationId) => {
  const query = `
    SELECT
      id,
      name,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      admin_restaurant_status AS status,
      submitted_time,
      created_at,
      updated_at,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      logo_id,
      cover_id,
      cuisines,
      food_served,
      latitude,
      longitude,
      city,
      state,
      pincode,
      landmark,
      house_no,
      operating_hours,
      account_holder_name,
      account_number,
      ifsc,
      bank_name,
      bank_proof_id,
      pan_document_id,
      gst_document_id,
      fssai_document_id,
      business_proof_document_number,
      business_proof_document_id,
      aadhaar_number,
      aadhaar_document_id
    FROM restaurants
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [registrationId]);

  return result.rows[0] || null;
};


/**
 * Updates one registration section.
 *
 * IMPORTANT:
 * Only fields defined in the section map below can be updated.
 * This prevents arbitrary column updates from the request.
 */
export const updateRegistrationSection = async (
  registrationId,
  section,
  data
) => {
  const sectionMap = {
    restaurant_details: {
      columns: [
        "name",
        "owner_name",
        "owner_mobile",
        "restaurant_type",
        "restaurant_email",
        "restaurant_contact",
        "password_hash",
        "logo_id",
        "cover_id",
        "cuisines",
        "food_served"
      ]
    },

    restaurant_location: {
      columns: [
        "latitude",
        "longitude",
        "city",
        "state",
        "pincode",
        "landmark",
        "house_no"
      ]
    },

    business_documents: {
      columns: [
        "fssai_number",
        "fssai_valid_until",
        "fssai_document_id",
        "pan",
        "pan_document_id",
        "gstin",
        "gst_document_id",
        "business_proof_document_number",
        "business_proof_document_id",
        "aadhaar_number",
        "aadhaar_document_id"
      ]
    },

    bank_account: {
      columns: [
        "account_holder_name",
        "account_number",
        "ifsc",
        "bank_name",
        "bank_proof_id"
      ]
    },

    operating_hours: {
      columns: [
        "operating_hours"
      ]
    },

    menu_setup: {
      columns: []
    }
  };

  const sectionConfig = sectionMap[section];

  if (!sectionConfig) {
    throw new Error(
      `Unsupported registration section: ${section}`
    );
  }

  /*
   * menu_setup is intentionally empty for now because
   * the current restaurants table does not contain menu
   * registration fields.
   */
  if (section === "menu_setup") {
    return findRegistrationById(registrationId);
  }

  const entries = Object.entries(data).filter(
    ([key]) =>
      sectionConfig.columns.includes(key) &&
      data[key] !== undefined
  );

  if (entries.length === 0) {
    throw new Error(
      `No valid fields supplied for section: ${section}`
    );
  }

  const setClauses = [];
  const values = [];

  for (const [column, value] of entries) {
    let processedValue = value;

    /*
     * JSONB columns must be serialized before being
     * sent to PostgreSQL.
     */
    if (
  column === "cuisines" ||
  column === "food_served" ||
  column === "operating_hours"
) {
  processedValue =
    typeof value === "string"
      ? value
      : JSON.stringify(value);
}

    values.push(processedValue);

    const parameter = `$${values.length}`;

    if (
      column === "cuisines" ||
      column === "food_served" ||
      column === "operating_hours"
    ) {
      setClauses.push(
        `${column} = ${parameter}::jsonb`
      );
    } else {
      setClauses.push(
        `${column} = ${parameter}`
      );
    }
  }

  values.push(registrationId);

  const query = `
    UPDATE public.restaurants
    SET
      ${setClauses.join(", ")},
      updated_at = NOW()
    WHERE id = $${values.length}
    RETURNING
      id,
      name,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      admin_restaurant_status AS status,
      created_at,
      updated_at,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      logo_id,
      cover_id,
      cuisines,
      food_served,
      latitude,
      longitude,
      city,
      state,
      pincode,
      landmark,
      house_no,
      operating_hours,
      account_holder_name,
      account_number,
      ifsc,
      bank_name,
      bank_proof_id,
      pan_document_id,
      gst_document_id,
      fssai_document_id,
      business_proof_document_number,
      business_proof_document_id,
      aadhaar_number,
      aadhaar_document_id
  `;

  const result = await pool.query(
    query,
    values
  );

  return result.rows[0] || null;
};


/**
 * Gets registration progress.
 *
 * The frontend should use this information to display
 * which registration sections are completed.
 *
 * Completion is calculated from the database, not from
 * frontend state.
 */
export const getRegistrationProgress = async (registrationId) => {
  const query = `
    SELECT
      id,

      (
        name IS NOT NULL
        AND NULLIF(TRIM(name), '') IS NOT NULL
        AND owner_name IS NOT NULL
        AND NULLIF(TRIM(owner_name), '') IS NOT NULL
        AND owner_mobile IS NOT NULL
        AND NULLIF(TRIM(owner_mobile), '') IS NOT NULL
        AND restaurant_type IS NOT NULL
        AND NULLIF(TRIM(restaurant_type), '') IS NOT NULL
        AND restaurant_email IS NOT NULL
        AND NULLIF(TRIM(restaurant_email), '') IS NOT NULL
        AND restaurant_contact IS NOT NULL
        AND NULLIF(TRIM(restaurant_contact), '') IS NOT NULL
        AND password_hash IS NOT NULL
        AND jsonb_typeof(cuisines) = 'array'
        AND jsonb_array_length(cuisines) > 0
        AND jsonb_typeof(food_served) = 'array'
        AND jsonb_array_length(food_served) > 0
      ) AS restaurant_details_completed,

      (
        latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND city IS NOT NULL
        AND NULLIF(TRIM(city), '') IS NOT NULL
        AND state IS NOT NULL
        AND NULLIF(TRIM(state), '') IS NOT NULL
        AND pincode IS NOT NULL
        AND NULLIF(TRIM(pincode), '') IS NOT NULL
        AND house_no IS NOT NULL
        AND NULLIF(TRIM(house_no), '') IS NOT NULL
      ) AS restaurant_location_completed,

      (
        pan IS NOT NULL
        AND NULLIF(TRIM(pan), '') IS NOT NULL
        AND pan_document_id IS NOT NULL
        AND fssai_number IS NOT NULL
        AND NULLIF(TRIM(fssai_number), '') IS NOT NULL
        AND fssai_valid_until IS NOT NULL
        AND fssai_document_id IS NOT NULL
        AND business_proof_document_number IS NOT NULL
        AND business_proof_document_id IS NOT NULL
        AND aadhaar_number IS NOT NULL
        AND aadhaar_document_id IS NOT NULL
        AND gstin IS NOT NULL
        AND NULLIF(TRIM(gstin), '') IS NOT NULL
        AND gst_document_id IS NOT NULL
      ) AS business_documents_completed,

      (
        account_holder_name IS NOT NULL
        AND NULLIF(TRIM(account_holder_name), '') IS NOT NULL
        AND account_number IS NOT NULL
        AND NULLIF(TRIM(account_number), '') IS NOT NULL
        AND ifsc IS NOT NULL
        AND NULLIF(TRIM(ifsc), '') IS NOT NULL
        AND bank_name IS NOT NULL
        AND NULLIF(TRIM(bank_name), '') IS NOT NULL
        AND bank_proof_id IS NOT NULL
      ) AS bank_account_completed,

      (
        operating_hours IS NOT NULL
        AND jsonb_typeof(operating_hours) = 'object'
        AND operating_hours <> '{}'::jsonb
      ) AS operating_hours_completed

    FROM restaurants
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [registrationId]);

  return result.rows[0] || null;
};


/**
 * Marks the registration as submitted.
 *
 * Final eligibility validation is performed by the
 * service layer before this repository method is called.
 */
export const markRegistrationSubmitted = async (registrationId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `
      SELECT UPPER(admin_restaurant_status::text) AS status
      FROM public.restaurants
      WHERE id = $1
      FOR UPDATE
      `,
      [registrationId]
    );

    if (currentResult.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }

    if (["ACTIVE", "ACCEPTED"].includes(currentResult.rows[0].status)) {
      const error = new Error(
        "Restaurant registration has already been accepted"
      );
      error.statusCode = 409;
      throw error;
    }

    if (currentResult.rows[0].status === "PENDING") {
      const error = new Error(
        "Restaurant registration is already pending review"
      );
      error.statusCode = 409;
      throw error;
    }

    const updatedResult = await client.query(
      `
      UPDATE public.restaurants
      SET
        admin_restaurant_status = 'PENDING',
        submitted_time = CASE
          WHEN UPPER(admin_restaurant_status::text) = 'REJECTED' THEN NOW()
          ELSE COALESCE(submitted_time, NOW())
        END,
        reject_reason = '[]'::jsonb,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        admin_restaurant_status AS status,
        submitted_time,
        updated_at
      `,
      [registrationId]
    );

    await client.query(
      `
      INSERT INTO public.restaurant_profile_change_requests (
        restaurant_id,
        restaurant_record_id,
        requested_changes,
        previous_values,
        status,
        request_type
      )
      SELECT
        restaurant.id,
        restaurant.id,
        to_jsonb(restaurant) - 'password_hash' - 'reject_reason',
        '{}'::jsonb,
        'pending',
        'registration'
      FROM public.restaurants AS restaurant
      WHERE restaurant.id = $1
      `,
      [registrationId]
    );

    await client.query("COMMIT");

    return updatedResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const listAdminRegistrationRequests = async (status) => {
  const result = await pool.query(
    `
    SELECT
      request.id AS request_id,
      request.restaurant_id,
      request.status AS request_status,
      request.rejection_reason,
      request.requested_by,
      request.reviewed_by,
      request.reviewed_at,
      request.created_at,
      restaurant.admin_restaurant_status,
      restaurant.submitted_time,
      to_jsonb(restaurant) - 'password_hash' - 'reject_reason' AS restaurant
    FROM public.restaurant_profile_change_requests AS request
    JOIN public.restaurants AS restaurant
      ON restaurant.id = request.restaurant_record_id
    WHERE request.request_type = 'registration'
      AND request.status = $1
    ORDER BY request.created_at DESC
    `,
    [status]
  );

  return result.rows;
};

export const decideAdminRegistrationRequest = async (
  requestId,
  adminId,
  decision,
  rejectionReason
) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const requestResult = await client.query(
      `
      SELECT id, restaurant_record_id AS restaurant_id, status
      FROM public.restaurant_profile_change_requests
      WHERE id = $1
        AND request_type = 'registration'
      FOR UPDATE
      `,
      [requestId]
    );

    if (requestResult.rowCount === 0) {
      const error = new Error("Registration request not found");
      error.statusCode = 404;
      throw error;
    }

    const request = requestResult.rows[0];
    if (request.status !== "pending") {
      const error = new Error("Registration request already reviewed");
      error.statusCode = 409;
      throw error;
    }

    const restaurantResult = await client.query(
      `
      UPDATE public.restaurants
      SET
        admin_restaurant_status = $2,
        owner_restaurant_status = COALESCE($3, owner_restaurant_status),
        reject_reason = $4::jsonb,
        updated_at = NOW()
      WHERE id = $1
        AND admin_restaurant_status = 'PENDING'
      RETURNING id, admin_restaurant_status AS status, updated_at
      `,
      [
        request.restaurant_id,
        decision === "ACCEPTED" ? "ACTIVE" : "REJECTED",
        decision === "ACCEPTED" ? "ACCEPTED" : null,
        JSON.stringify(
          decision === "REJECTED" ? [rejectionReason] : []
        )
      ]
    );

    if (restaurantResult.rowCount === 0) {
      const error = new Error(
        "Restaurant is no longer pending review"
      );
      error.statusCode = 409;
      throw error;
    }

    const updatedRequestResult = await client.query(
      `
      UPDATE public.restaurant_profile_change_requests
      SET
        status = $2,
        reviewed_by = $3,
        reviewed_at = NOW(),
        rejection_reason = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id AS request_id,
        restaurant_id,
        status AS request_status,
        rejection_reason,
        reviewed_by,
        reviewed_at,
        updated_at
      `,
      [
        requestId,
        decision === "ACCEPTED" ? "approved" : "rejected",
        adminId,
        decision === "REJECTED" ? rejectionReason : null
      ]
    );

    await client.query("COMMIT");

    return {
      ...updatedRequestResult.rows[0],
      admin_restaurant_status: restaurantResult.rows[0].status
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getRestaurantRegistrationReviewStatus = async (
  registrationId
) => {
  const query = `
    SELECT
      id,
      name AS restaurant_name,
      CASE
        WHEN UPPER(admin_restaurant_status::text) IN ('ACTIVE', 'ACCEPTED') THEN 'accepted'
        WHEN UPPER(admin_restaurant_status::text) = 'REJECTED' THEN 'rejected'
        WHEN UPPER(admin_restaurant_status::text) = 'PENDING' THEN 'pending'
        ELSE 'draft'
      END AS review_status,
      submitted_time,
      reject_reason AS rejection_reasons
    FROM public.restaurants
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [registrationId]);

  return result.rows[0] || null;
};

export const updateRestaurantImages = async (
  registrationId,
  logoId,
  coverId
) => {
  const result = await pool.query(
    `
      UPDATE public.restaurants
      SET
        logo_id = COALESCE($1, logo_id),
        cover_id = COALESCE($2, cover_id),
        updated_at = NOW()
      WHERE id = $3
      RETURNING
        id,
        logo_id,
        cover_id
    `,
    [
      logoId,
      coverId,
      registrationId
    ]
  );

  return result.rows[0] || null;
};