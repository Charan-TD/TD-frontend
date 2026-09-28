import pool from "../config/database.js";

// Get delivery partners with pagination
export const getDeliveryPartnerUsers = async ({
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
      license_number,
      license_verified,
      aadhaar_verified,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at,
      user_type,
      profile_image_url,
      phone,
      email,
      full_name,
      date_of_birth,
      gender,
      vehicle_type,
      vehicle_number
    FROM delivery_partner_users
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

  const result = await pool.query(query, values);

  const countValues = [];

  let countQuery = `
    SELECT COUNT(*)::int AS total
    FROM delivery_partner_users
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

// Find delivery partner by ID
export const findDeliveryPartnerUserById = async (
  id
) => {
  const query = `
    SELECT
      id,
      license_number,
      license_verified,
      aadhaar_verified,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at,
      user_type,
      profile_image_url,
      phone,
      email,
      full_name,
      date_of_birth,
      gender,
      vehicle_type,
      vehicle_number
    FROM delivery_partner_users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

// Find delivery partner by license number
export const findDeliveryPartnerByLicense = async (
  licenseNumber
) => {
  const query = `
    SELECT
      id,
      license_number,
      license_verified,
      aadhaar_verified,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at,
      user_type,
      profile_image_url,
      phone,
      email,
      full_name,
      date_of_birth,
      gender,
      vehicle_type,
      vehicle_number
    FROM delivery_partner_users
    WHERE license_number = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [
    licenseNumber
  ]);

  return result.rows[0] || null;
};

// Find delivery partner by phone
export const findDeliveryPartnerByPhone = async (
  phone
) => {
  const query = `
    SELECT
      id,
      license_number,
      license_verified,
      aadhaar_verified,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at,
      user_type,
      profile_image_url,
      phone,
      email,
      full_name,
      date_of_birth,
      gender,
      vehicle_type,
      vehicle_number
    FROM delivery_partner_users
    WHERE phone = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [phone]);

  return result.rows[0] || null;
};

// Find delivery partner by email
export const findDeliveryPartnerByEmail = async (
  email
) => {
  const query = `
    SELECT
      id,
      license_number,
      license_verified,
      aadhaar_verified,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at,
      user_type,
      profile_image_url,
      phone,
      email,
      full_name,
      date_of_birth,
      gender,
      vehicle_type,
      vehicle_number
    FROM delivery_partner_users
    WHERE email = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0] || null;
};

// Create delivery partner
export const createDeliveryPartnerUser = async ({
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
}) => {
  const query = `
    INSERT INTO delivery_partner_users (
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
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, COALESCE($7, 'PENDING'),
      $8, $9, $10, $11, $12,
      $13, $14, $15
    )
    RETURNING
      id,
      license_number,
      license_verified,
      aadhaar_verified,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at,
      user_type,
      profile_image_url,
      phone,
      email,
      full_name,
      date_of_birth,
      gender,
      vehicle_type,
      vehicle_number
  `;

  const values = [
    license_number,
    license_verified ?? false,
    aadhaar_verified ?? false,
    bank_account_number,
    bank_ifsc,
    bank_account_holder,
    status ?? null,
    profile_image_url ?? null,
    phone ?? null,
    email ?? null,
    full_name ?? null,
    date_of_birth ?? null,
    gender ?? null,
    vehicle_type ?? null,
    vehicle_number ?? null
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

// Update delivery partner
export const updateDeliveryPartnerUser = async (
  id,
  {
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
  }
) => {
  const query = `
    UPDATE delivery_partner_users
    SET
      license_number = COALESCE($1, license_number),
      license_verified = COALESCE($2, license_verified),
      aadhaar_verified = COALESCE($3, aadhaar_verified),
      bank_account_number = COALESCE($4, bank_account_number),
      bank_ifsc = COALESCE($5, bank_ifsc),
      bank_account_holder = COALESCE($6, bank_account_holder),
      status = COALESCE($7, status),
      profile_image_url = COALESCE($8, profile_image_url),
      phone = COALESCE($9, phone),
      email = COALESCE($10, email),
      full_name = COALESCE($11, full_name),
      date_of_birth = COALESCE($12, date_of_birth),
      gender = COALESCE($13, gender),
      vehicle_type = COALESCE($14, vehicle_type),
      vehicle_number = COALESCE($15, vehicle_number),
      updated_at = now()
    WHERE id = $16
    RETURNING
      id,
      license_number,
      license_verified,
      aadhaar_verified,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at,
      user_type,
      profile_image_url,
      phone,
      email,
      full_name,
      date_of_birth,
      gender,
      vehicle_type,
      vehicle_number
  `;

  const values = [
    license_number ?? null,
    license_verified ?? null,
    aadhaar_verified ?? null,
    bank_account_number ?? null,
    bank_ifsc ?? null,
    bank_account_holder ?? null,
    status ?? null,
    profile_image_url ?? null,
    phone ?? null,
    email ?? null,
    full_name ?? null,
    date_of_birth ?? null,
    gender ?? null,
    vehicle_type ?? null,
    vehicle_number ?? null,
    id
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

// Update delivery partner status
export const updateDeliveryPartnerStatus = async (
  id,
  status
) => {
  const query = `
    UPDATE delivery_partner_users
    SET
      status = $1,
      updated_at = now()
    WHERE id = $2
    RETURNING
      id,
      license_number,
      license_verified,
      aadhaar_verified,
      bank_account_number,
      bank_ifsc,
      bank_account_holder,
      status,
      created_at,
      updated_at,
      user_type,
      profile_image_url,
      phone,
      email,
      full_name,
      date_of_birth,
      gender,
      vehicle_type,
      vehicle_number
  `;

  const result = await pool.query(query, [
    status,
    id
  ]);

  return result.rows[0] || null;
};