import pool from "../config/database.js";

// Get restaurants with pagination
export const getRestaurants = async ({
  page = 1,
  limit = 20,
  status
}) => {
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`admin_restaurant_status = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

  values.push(limit);
  const limitParam = values.length;

  values.push(offset);
  const offsetParam = values.length;

  const query = `
    SELECT
      id,
      name,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      admin_restaurant_status AS status,
      operating_hours,
      created_at,
      updated_at
    FROM restaurants
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

  const result = await pool.query(query, values);

  const countValues = [];

  let countQuery = `
    SELECT COUNT(*)::int AS total
    FROM restaurants
  `;

  if (status) {
    countValues.push(status);
    countQuery += ` WHERE admin_restaurant_status = $1`;
  }

  const countResult = await pool.query(
    countQuery,
    countValues
  );

  return {
    rows: result.rows,
    total: countResult.rows[0].total
  };
};

// Find restaurant by ID
export const findRestaurantById = async (id) => {
  const query = `
    SELECT
      id,
      name,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      admin_restaurant_status AS status,
      created_at,
      updated_at
    FROM restaurants
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

export const findRestaurantReviewDetailsById = async (id) => {
  const result = await pool.query(
    `
    SELECT
      id,
      name,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      pan,
      pan_document_id,
      gstin,
      gst_document_id,
      fssai_number,
      fssai_valid_until,
      fssai_document_id,
      business_proof_document_number,
      business_proof_document_id,
      aadhaar_number,
      aadhaar_document_id,
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
      admin_restaurant_status AS status,
      owner_restaurant_status,
      submitted_time,
      reject_reason,
      created_at,
      updated_at
    FROM public.restaurants
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
};

// Find restaurant by PAN
export const findRestaurantByPan = async (pan) => {
  const query = `
    SELECT
      id,
      name,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      admin_restaurant_status AS status,
      created_at,
      updated_at
    FROM restaurants
    WHERE pan = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [pan]);

  return result.rows[0] || null;
};

// Find restaurant by GSTIN
export const findRestaurantByGstin = async (gstin) => {
  const query = `
    SELECT
      id,
      name,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      admin_restaurant_status AS status,
      created_at,
      updated_at
    FROM restaurants
    WHERE gstin = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [gstin]);

  return result.rows[0] || null;
};

// Create restaurant
export const createRestaurant = async ({
  name,
  restaurant_type,
  pan,
  gstin,
  fssai_number,
  fssai_valid_until,
  account_number,
  ifsc,
  account_holder_name,
  bank_proof_id,
  status
}) => {
  const query = `
    INSERT INTO restaurants (
      name,
      restaurant_type,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      account_number,
      ifsc,
      account_holder_name,
      bank_proof_id,
      admin_restaurant_status
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      COALESCE($11, 'ACTIVE')
    )
    RETURNING
      id,
      name,
      restaurant_type,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      account_number,
      ifsc,
      account_holder_name,
      bank_proof_id,
      admin_restaurant_status AS status,
      created_at,
      updated_at
  `;

  const values = [
    name,
    restaurant_type,
    pan ?? null,
    gstin ?? null,
    fssai_number ?? null,
    fssai_valid_until ?? null,
    account_number ?? null,
    ifsc ?? null,
    account_holder_name ?? null,
    bank_proof_id ?? null,
    status ?? null
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

// Update restaurant
export const updateRestaurant = async (
  id,
  {
    name,
    pan,
    gstin,
    fssai_number,
    fssai_valid_until,
    account_number,
    ifsc,
    account_holder_name,
    bank_proof_id,
    status
  }
) => {
  const query = `
    UPDATE restaurants
    SET
      name = COALESCE($1, name),
      pan = COALESCE($2, pan),
      gstin = COALESCE($3, gstin),
      fssai_number = COALESCE($4, fssai_number),
      fssai_valid_until = COALESCE($5, fssai_valid_until),
      account_number = COALESCE($6, account_number),
      ifsc = COALESCE($7, ifsc),
      account_holder_name = COALESCE($8, account_holder_name),
      bank_proof_id = COALESCE($9, bank_proof_id),
      admin_restaurant_status = COALESCE($10, admin_restaurant_status),
      updated_at = now()
    WHERE id = $11
    RETURNING
      id,
      name,
      restaurant_type,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      account_number,
      ifsc,
      account_holder_name,
      bank_proof_id,
      admin_restaurant_status AS status,
      created_at,
      updated_at
  `;

  const values = [
    name ?? null,
    pan ?? null,
    gstin ?? null,
    fssai_number ?? null,
    fssai_valid_until ?? null,
    account_number ?? null,
    ifsc ?? null,
    account_holder_name ?? null,
    bank_proof_id ?? null,
    status ?? null,
    id
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

// Deactivate restaurant
export const deactivateRestaurant = async (id) => {
  const query = `
    UPDATE restaurants
    SET
      admin_restaurant_status = 'INACTIVE',
      updated_at = now()
    WHERE id = $1
    RETURNING
      id,
      name,
      owner_name,
      owner_mobile,
      restaurant_type,
      restaurant_email,
      restaurant_contact,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      admin_restaurant_status AS status,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

export const decideRestaurantRegistration = async (
  id,
  decision,
  rejectionReason,
  adminId
) => {
  const status = decision === "approve" ? "ACTIVE" : "REJECTED";
  const ownerStatus =
    decision === "approve" ? "ACCEPTED" : null;
  const rejectReason = decision === "reject"
    ? JSON.stringify([rejectionReason])
    : JSON.stringify([]);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE public.restaurants
      SET
        admin_restaurant_status = $2,
        owner_restaurant_status = COALESCE($3, owner_restaurant_status),
        reject_reason = $4::jsonb,
        updated_at = NOW()
      WHERE id = $1
        AND admin_restaurant_status = 'PENDING'
      RETURNING
        id,
        admin_restaurant_status AS status,
        owner_restaurant_status,
        reject_reason,
        updated_at
      `,
      [id, status, ownerStatus, rejectReason]
    );

    if (result.rowCount === 0) {
      const existing = await client.query(
        `
        SELECT admin_restaurant_status AS status
        FROM public.restaurants
        WHERE id = $1
        `,
        [id]
      );

      await client.query("ROLLBACK");

      if (existing.rowCount === 0) {
        return null;
      }

      return {
        conflict: true,
        status: existing.rows[0].status
      };
    }

    await client.query(
      `
      UPDATE public.restaurant_profile_change_requests
      SET
        status = $2,
        reviewed_by = $3,
        reviewed_at = NOW(),
        rejection_reason = $4,
        updated_at = NOW()
      WHERE restaurant_id = $1
        AND request_type = 'registration'
        AND status = 'pending'
      `,
      [
        id,
        decision === "approve" ? "approved" : "rejected",
        adminId,
        decision === "reject" ? rejectionReason : null
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};