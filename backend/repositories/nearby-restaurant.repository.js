
import pool from "../config/database.js";

export const getStationDropdown = async () => {
  const result = await pool.query(`
    SELECT
      id AS station_id,
      name,
      code,
      city,
      state
    FROM public.stations
    WHERE status = TRUE
    ORDER BY name ASC
  `);

  return result.rows;
};

export const findStationByName = async (stationName) => {
  const result = await pool.query(
    `
    SELECT id, name, code, city, state
    FROM public.stations
    WHERE LOWER(name) = LOWER($1)
      AND status = TRUE
    ORDER BY name
    LIMIT 1
    `,
    [stationName]
  );

  return result.rows[0] || null;
};

export const findNearbyRestaurantsWithMenuItems = async (
  stationId
) => {
  const result = await pool.query(
    `
    SELECT
      r.restaurant_id,
      r.name AS restaurant_name,
      r.restaurant_type,
      r.cuisines,
      r.food_served,
      r.city,
      r.state,
      r.operating_hours,
      r.logo_id,
      r.cover_id,
      rss.distance_km,
      rss.travel_time_minutes,
      rss.buffer_minutes,
      rss.delivery_fee,
      rss.max_orders,
      rss.status AS station_service_status,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', mi.id,
              'name', mi.name,
              'description', mi.description,
              'price', mi.price,
              'discounted_price', mi.discounted_price,
              'tax_rate', mi.tax_rate,
              'preparation_time_minutes',
                mi.preparation_time_minutes,
              'category_id', mi.category_id,
              'qty_type', (
                SELECT quantity_type.qty_type_name
                FROM public.food_qty_type quantity_type
                WHERE quantity_type.qty_type_id = mi.qty_type_id
              ),
              'quantity', mi.quantity,
              'owner_is_available',
                mi.owner_is_available,
              'admin_is_available',
                mi.admin_is_available,
              'food_served', mi.food_served,
              'addons', mi.addons,
              'img_id', mi.img_id
            )
            ORDER BY mi.name
          )
          FROM public.restaurant_menu_items mi
          WHERE mi.restaurant_id = r.restaurant_id
        ),
        '[]'::jsonb
      ) AS menu_items
    FROM public.restaurant_station_services rss
    JOIN public.restaurants r
      ON r.restaurant_id = rss.restaurant_id
    WHERE rss.station_id = $1
      AND rss.distance_km <= 2
    ORDER BY rss.distance_km ASC, r.name ASC
    `,
    [stationId]
  );

  return result.rows;
};
