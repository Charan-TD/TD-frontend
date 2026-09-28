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
    conditions.push(`status = $${values.length}`);
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
      business_type,
      legal_name,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
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
    countQuery += ` WHERE status = $1`;
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
      business_type,
      legal_name,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at
    FROM restaurants
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

// Find restaurant by PAN
export const findRestaurantByPan = async (pan) => {
  const query = `
    SELECT
      id,
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
      status,
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
      business_type,
      legal_name,
      pan,
      gstin,
      fssai_number,
      fssai_valid_until,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
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
}) => {
  const query = `
    INSERT INTO restaurants (
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
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      COALESCE($11, 'ACTIVE')
    )
    RETURNING
      id,
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
      status,
      created_at,
      updated_at
  `;

  const values = [
    name,
    business_type,
    legal_name ?? null,
    pan ?? null,
    gstin ?? null,
    fssai_number ?? null,
    fssai_valid_until ?? null,
    bank_account_number ?? null,
    bank_ifsc ?? null,
    bank_account_holder ?? null,
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
  }
) => {
  const query = `
    UPDATE restaurants
    SET
      name = COALESCE($1, name),
      business_type = COALESCE($2, business_type),
      legal_name = COALESCE($3, legal_name),
      pan = COALESCE($4, pan),
      gstin = COALESCE($5, gstin),
      fssai_number = COALESCE($6, fssai_number),
      fssai_valid_until = COALESCE($7, fssai_valid_until),
      bank_account_number = COALESCE($8, bank_account_number),
      bank_ifsc = COALESCE($9, bank_ifsc),
      bank_account_holder = COALESCE($10, bank_account_holder),
      status = COALESCE($11, status),
      updated_at = now()
    WHERE id = $12
    RETURNING
      id,
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
      status,
      created_at,
      updated_at
  `;

  const values = [
    name ?? null,
    business_type ?? null,
    legal_name ?? null,
    pan ?? null,
    gstin ?? null,
    fssai_number ?? null,
    fssai_valid_until ?? null,
    bank_account_number ?? null,
    bank_ifsc ?? null,
    bank_account_holder ?? null,
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
      status = 'INACTIVE',
      updated_at = now()
    WHERE id = $1
    RETURNING
      id,
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
      status,
      created_at,
      updated_at
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};