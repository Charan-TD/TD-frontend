import pool from "../config/database.js";

// Get customers with pagination
export const getCustomerUsers = async ({
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
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
    FROM customer_users
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

  const result = await pool.query(query, values);

  const countValues = [];
  let countQuery = `
    SELECT COUNT(*)::int AS total
    FROM customer_users
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

// Find customer by ID
export const findCustomerUserById = async (id) => {
  const query = `
    SELECT
      id,
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
    FROM customer_users
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

// Find customer by phone
export const findCustomerUserByPhone = async (phone) => {
  const query = `
    SELECT
      id,
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
    FROM customer_users
    WHERE phone = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [phone]);

  return result.rows[0] || null;
};

// Find customer by email
export const findCustomerUserByEmail = async (email) => {
  const query = `
    SELECT
      id,
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
    FROM customer_users
    WHERE email = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [email]);

  return result.rows[0] || null;
};

// Create customer
export const createCustomerUser = async ({
  phone,
  email,
  full_name,
  profile_image_url,
  date_of_birth,
  gender,
  status
}) => {
  const query = `
    INSERT INTO customer_users (
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'ACTIVE'))
    RETURNING
      id,
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
  `;

  const values = [
    phone ?? null,
    email ?? null,
    full_name ?? null,
    profile_image_url ?? null,
    date_of_birth ?? null,
    gender ?? null,
    status ?? null
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

// Update customer
export const updateCustomerUser = async (
  id,
  {
    phone,
    email,
    full_name,
    profile_image_url,
    date_of_birth,
    gender,
    status
  }
) => {
  const query = `
    UPDATE customer_users
    SET
      phone = COALESCE($1, phone),
      email = COALESCE($2, email),
      full_name = COALESCE($3, full_name),
      profile_image_url = COALESCE($4, profile_image_url),
      date_of_birth = COALESCE($5, date_of_birth),
      gender = COALESCE($6, gender),
      status = COALESCE($7, status),
      updated_at = now()
    WHERE id = $8
    RETURNING
      id,
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
  `;

  const values = [
    phone ?? null,
    email ?? null,
    full_name ?? null,
    profile_image_url ?? null,
    date_of_birth ?? null,
    gender ?? null,
    status ?? null,
    id
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

// Deactivate customer
export const deactivateCustomerUser = async (id) => {
  const query = `
    UPDATE customer_users
    SET
      status = 'INACTIVE',
      updated_at = now()
    WHERE id = $1
    RETURNING
      id,
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};