import pool from "../config/database.js";

// Get stations with pagination
export const getStations = async ({
  page = 1,
  limit = 20
}) => {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      id,
      name,
      code,
      city,
      state,
      latitude,
      longitude,
      created_at
    FROM stations
    ORDER BY created_at DESC
    LIMIT $1
    OFFSET $2
  `;

  const result = await pool.query(query, [
    limit,
    offset
  ]);

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM stations
  `;

  const countResult = await pool.query(countQuery);

  return {
    rows: result.rows,
    total: countResult.rows[0].total
  };
};

// Find station by ID
export const findStationById = async (id) => {
  const query = `
    SELECT
      id,
      name,
      code,
      city,
      state,
      latitude,
      longitude,
      created_at
    FROM stations
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

// Find station by code
export const findStationByCode = async (code) => {
  const query = `
    SELECT
      id,
      name,
      code,
      city,
      state,
      latitude,
      longitude,
      created_at
    FROM stations
    WHERE UPPER(code) = UPPER($1)
    LIMIT 1
  `;

  const result = await pool.query(query, [code]);

  return result.rows[0] || null;
};

// Create station
export const createStation = async ({
  name,
  code,
  city,
  state,
  latitude,
  longitude
}) => {
  const query = `
    INSERT INTO stations (
      name,
      code,
      city,
      state,
      latitude,
      longitude
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING
      id,
      name,
      code,
      city,
      state,
      latitude,
      longitude,
      created_at
  `;

  const values = [
    name,
    code,
    city,
    state,
    latitude ?? null,
    longitude ?? null
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

// Update station
export const updateStation = async (
  id,
  {
    name,
    code,
    city,
    state,
    latitude,
    longitude
  }
) => {
  const query = `
    UPDATE stations
    SET
      name = COALESCE($1, name),
      code = COALESCE($2, code),
      city = COALESCE($3, city),
      state = COALESCE($4, state),
      latitude = COALESCE($5, latitude),
      longitude = COALESCE($6, longitude)
    WHERE id = $7
    RETURNING
      id,
      name,
      code,
      city,
      state,
      latitude,
      longitude,
      created_at
  `;

  const values = [
    name ?? null,
    code ?? null,
    city ?? null,
    state ?? null,
    latitude ?? null,
    longitude ?? null,
    id
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

// Delete station
export const deleteStation = async (id) => {
  const query = `
    DELETE FROM stations
    WHERE id = $1
    RETURNING
      id,
      name,
      code,
      city,
      state,
      latitude,
      longitude,
      created_at
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};