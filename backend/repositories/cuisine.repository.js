import pool from "../config/database.js";

export const getAllCuisines = async () => {
  const result = await pool.query(`
    SELECT
      cuisine_id,
      name
    FROM public.cuisines
    ORDER BY name ASC
  `);

  return result.rows;
};