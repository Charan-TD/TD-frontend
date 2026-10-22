
import pool from "../config/database.js";

export const findFoodCategory = async (categoryId) => {
  const result = await pool.query(
    `
    SELECT category_id, category_name, parent_id, level
    FROM public.food_categories
    WHERE category_id = $1
      AND is_active = TRUE
      AND level >= 1
    LIMIT 1
    `,
    [categoryId]
  );

  return result.rows[0] || null;
};

export const createAddon = async (
  restaurantId,
  data
) => {
  const result = await pool.query(
    `
    INSERT INTO public.restaurant_addons (
      restaurant_id,
      category_id,
      addon_name,
      price,
      is_available
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      restaurantId,
      data.category_id,
      data.addon_name,
      data.price,
      data.is_available ?? true
    ]
  );

  return result.rows[0];
};

export const listRestaurantAddons = async (
  restaurantId
) => {
  const result = await pool.query(
    `
    SELECT
      addon_id,
      category_id,
      addon_name,
      price,
      is_available,
      created_at,
      updated_at
    FROM public.restaurant_addons
    WHERE restaurant_id = $1
    ORDER BY addon_name ASC
    `,
    [restaurantId]
  );

  return result.rows;
};

/*
 * Eligible categories:
 *
 * - The selected category itself
 * - Its descendants
 * - Its non-root ancestors
 *
 * Importantly, selecting a subcategory never
 * includes its sibling subcategories.
 */
export const getSuggestedAddons = async (
  restaurantId,
  categoryId
) => {
  const result = await pool.query(
    `
    WITH RECURSIVE
    descendants AS (
      SELECT category_id, parent_id, level
      FROM public.food_categories
      WHERE category_id = $2
        AND is_active = TRUE

      UNION

      SELECT fc.category_id, fc.parent_id, fc.level
      FROM public.food_categories fc
      JOIN descendants d
        ON fc.parent_id = d.category_id
      WHERE fc.is_active = TRUE
    ),
    ancestors AS (
      SELECT category_id, parent_id, level
      FROM public.food_categories
      WHERE category_id = $2
        AND is_active = TRUE

      UNION

      SELECT fc.category_id, fc.parent_id, fc.level
      FROM public.food_categories fc
      JOIN ancestors a
        ON fc.category_id = a.parent_id
      WHERE fc.is_active = TRUE
        AND fc.level >= 1
    ),
    eligible_categories AS (
      SELECT category_id
      FROM descendants
      WHERE level >= 1

      UNION

      SELECT category_id
      FROM ancestors
      WHERE level >= 1
    )
    SELECT
      a.addon_id,
      a.category_id,
      a.addon_name,
      a.price,
      a.is_available
    FROM public.restaurant_addons a
    WHERE a.restaurant_id = $1
      AND a.is_available = TRUE
      AND a.category_id IN (
        SELECT category_id
        FROM eligible_categories
      )
    ORDER BY a.addon_name ASC
    `,
    [restaurantId, categoryId]
  );

  return result.rows;
};

export const updateRestaurantAddon = async (
  restaurantId,
  addonId,
  data
) => {
  const allowedFields = [
    "addon_name",
    "price",
    "is_available",
    "category_id"
  ];

  const fields = allowedFields.filter(
    (field) => data[field] !== undefined
  );

  if (fields.length === 0) {
    return null;
  }

  const values = fields.map((field) => data[field]);

  const assignments = fields.map(
    (field, index) =>
      `${field} = $${index + 3}`
  );

  const result = await pool.query(
    `
    UPDATE public.restaurant_addons
    SET
      ${assignments.join(", ")},
      updated_at = NOW()
    WHERE restaurant_id = $1
      AND addon_id = $2
    RETURNING *
    `,
    [restaurantId, addonId, ...values]
  );

  return result.rows[0] || null;
};

export const deactivateRestaurantAddon = async (
  restaurantId,
  addonId
) => {
  const result = await pool.query(
    `
    UPDATE public.restaurant_addons
    SET
      is_available = FALSE,
      updated_at = NOW()
    WHERE restaurant_id = $1
      AND addon_id = $2
    RETURNING *
    `,
    [restaurantId, addonId]
  );

  return result.rows[0] || null;
};
