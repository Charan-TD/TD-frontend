import pool from "../config/database.js";

// Get orders with pagination and optional status filter
export const getOrders = async ({
  page = 1,
  limit = 20,
  status
}) => {
  const offset = (page - 1) * limit;

  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`o.status = $${values.length}`);
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
      o.id,
      o.customer_user_id,
      o.train_id,
      o.journey_date,
      o.boarding_station_id,
      o.coach,
      o.seat,
      o.pnr,
      o.queue_time_minutes,
      o.delivery_deadline,
      o.is_deliverable,
      o.status,
      o.subtotal,
      o.tax,
      o.packaging_fee,
      o.delivery_fee,
      o.total,
      o.customer_note,
      o.created_at,
      o.updated_at,
      o.discount,
      o.restaurant_station_service_id,
      o.idempotency_key,
      o.delivery_train_stop_id
    FROM orders o
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
  `;

  const result = await pool.query(query, values);

  const countValues = [];

  let countQuery = `
    SELECT COUNT(*)::int AS total
    FROM orders o
  `;

  if (status) {
    countValues.push(status);
    countQuery += ` WHERE o.status = $1`;
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

// Find order by ID
export const findOrderById = async (id) => {
  const query = `
    SELECT
      o.id,
      o.customer_user_id,
      o.train_id,
      o.journey_date,
      o.boarding_station_id,
      o.coach,
      o.seat,
      o.pnr,
      o.queue_time_minutes,
      o.delivery_deadline,
      o.is_deliverable,
      o.status,
      o.subtotal,
      o.tax,
      o.packaging_fee,
      o.delivery_fee,
      o.total,
      o.customer_note,
      o.created_at,
      o.updated_at,
      o.discount,
      o.restaurant_station_service_id,
      o.idempotency_key,
      o.delivery_train_stop_id
    FROM orders o
    WHERE o.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0] || null;
};

// Find order by idempotency key
export const findOrderByIdempotencyKey = async (
  idempotencyKey
) => {
  const query = `
    SELECT
      o.id,
      o.customer_user_id,
      o.train_id,
      o.journey_date,
      o.boarding_station_id,
      o.coach,
      o.seat,
      o.pnr,
      o.queue_time_minutes,
      o.delivery_deadline,
      o.is_deliverable,
      o.status,
      o.subtotal,
      o.tax,
      o.packaging_fee,
      o.delivery_fee,
      o.total,
      o.customer_note,
      o.created_at,
      o.updated_at,
      o.discount,
      o.restaurant_station_service_id,
      o.idempotency_key,
      o.delivery_train_stop_id
    FROM orders o
    WHERE o.idempotency_key = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [
    idempotencyKey
  ]);

  return result.rows[0] || null;
};

// Get orders for a customer
export const getOrdersByCustomerId = async (
  customerUserId,
  { page = 1, limit = 20 } = {}
) => {
  const offset = (page - 1) * limit;

  const query = `
    SELECT
      o.id,
      o.customer_user_id,
      o.train_id,
      o.journey_date,
      o.boarding_station_id,
      o.coach,
      o.seat,
      o.pnr,
      o.queue_time_minutes,
      o.delivery_deadline,
      o.is_deliverable,
      o.status,
      o.subtotal,
      o.tax,
      o.packaging_fee,
      o.delivery_fee,
      o.total,
      o.customer_note,
      o.created_at,
      o.updated_at,
      o.discount,
      o.restaurant_station_service_id,
      o.idempotency_key,
      o.delivery_train_stop_id
    FROM orders o
    WHERE o.customer_user_id = $1
    ORDER BY o.created_at DESC
    LIMIT $2
    OFFSET $3
  `;

  const result = await pool.query(query, [
    customerUserId,
    limit,
    offset
  ]);

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM orders
    WHERE customer_user_id = $1
  `;

  const countResult = await pool.query(countQuery, [
    customerUserId
  ]);

  return {
    rows: result.rows,
    total: countResult.rows[0].total
  };
};

// Create order
export const createOrder = async ({
  customer_user_id,
  train_id,
  journey_date,
  boarding_station_id,
  coach,
  seat,
  pnr,
  queue_time_minutes,
  delivery_deadline,
  is_deliverable,
  status,
  subtotal,
  tax,
  packaging_fee,
  delivery_fee,
  total,
  customer_note,
  discount,
  restaurant_station_service_id,
  idempotency_key,
  delivery_train_stop_id
}) => {
  const query = `
    INSERT INTO orders (
      customer_user_id,
      train_id,
      journey_date,
      boarding_station_id,
      coach,
      seat,
      pnr,
      queue_time_minutes,
      delivery_deadline,
      is_deliverable,
      status,
      subtotal,
      tax,
      packaging_fee,
      delivery_fee,
      total,
      customer_note,
      discount,
      restaurant_station_service_id,
      idempotency_key,
      delivery_train_stop_id
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, COALESCE($8, 0),
      $9, $10, COALESCE($11, 'PLACED'),
      $12, COALESCE($13, 0),
      COALESCE($14, 0),
      COALESCE($15, 0),
      $16, $17, COALESCE($18, 0),
      $19, $20, $21
    )
    RETURNING
      id,
      customer_user_id,
      train_id,
      journey_date,
      boarding_station_id,
      coach,
      seat,
      pnr,
      queue_time_minutes,
      delivery_deadline,
      is_deliverable,
      status,
      subtotal,
      tax,
      packaging_fee,
      delivery_fee,
      total,
      customer_note,
      created_at,
      updated_at,
      discount,
      restaurant_station_service_id,
      idempotency_key,
      delivery_train_stop_id
  `;

  const values = [
    customer_user_id,
    train_id,
    journey_date,
    boarding_station_id,
    coach ?? null,
    seat ?? null,
    pnr ?? null,
    queue_time_minutes ?? null,
    delivery_deadline ?? null,
    is_deliverable,
    status ?? null,
    subtotal,
    tax ?? null,
    packaging_fee ?? null,
    delivery_fee ?? null,
    total,
    customer_note ?? null,
    discount ?? null,
    restaurant_station_service_id,
    idempotency_key ?? null,
    delivery_train_stop_id ?? null
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

// Update order
export const updateOrder = async (
  id,
  {
    coach,
    seat,
    pnr,
    queue_time_minutes,
    delivery_deadline,
    is_deliverable,
    status,
    subtotal,
    tax,
    packaging_fee,
    delivery_fee,
    total,
    customer_note,
    discount,
    restaurant_station_service_id,
    delivery_train_stop_id
  }
) => {
  const query = `
    UPDATE orders
    SET
      coach = COALESCE($1, coach),
      seat = COALESCE($2, seat),
      pnr = COALESCE($3, pnr),
      queue_time_minutes =
        COALESCE($4, queue_time_minutes),
      delivery_deadline =
        COALESCE($5, delivery_deadline),
      is_deliverable =
        COALESCE($6, is_deliverable),
      status = COALESCE($7, status),
      subtotal = COALESCE($8, subtotal),
      tax = COALESCE($9, tax),
      packaging_fee =
        COALESCE($10, packaging_fee),
      delivery_fee =
        COALESCE($11, delivery_fee),
      total = COALESCE($12, total),
      customer_note =
        COALESCE($13, customer_note),
      discount = COALESCE($14, discount),
      restaurant_station_service_id =
        COALESCE($15, restaurant_station_service_id),
      delivery_train_stop_id =
        COALESCE($16, delivery_train_stop_id),
      updated_at = now()
    WHERE id = $17
    RETURNING
      id,
      customer_user_id,
      train_id,
      journey_date,
      boarding_station_id,
      coach,
      seat,
      pnr,
      queue_time_minutes,
      delivery_deadline,
      is_deliverable,
      status,
      subtotal,
      tax,
      packaging_fee,
      delivery_fee,
      total,
      customer_note,
      created_at,
      updated_at,
      discount,
      restaurant_station_service_id,
      idempotency_key,
      delivery_train_stop_id
  `;

  const values = [
    coach ?? null,
    seat ?? null,
    pnr ?? null,
    queue_time_minutes ?? null,
    delivery_deadline ?? null,
    is_deliverable ?? null,
    status ?? null,
    subtotal ?? null,
    tax ?? null,
    packaging_fee ?? null,
    delivery_fee ?? null,
    total ?? null,
    customer_note ?? null,
    discount ?? null,
    restaurant_station_service_id ?? null,
    delivery_train_stop_id ?? null,
    id
  ];

  const result = await pool.query(query, values);

  return result.rows[0] || null;
};

// Update order status
export const updateOrderStatus = async (
  id,
  status
) => {
  const query = `
    UPDATE orders
    SET
      status = $1,
      updated_at = now()
    WHERE id = $2
    RETURNING
      id,
      customer_user_id,
      train_id,
      journey_date,
      boarding_station_id,
      coach,
      seat,
      pnr,
      queue_time_minutes,
      delivery_deadline,
      is_deliverable,
      status,
      subtotal,
      tax,
      packaging_fee,
      delivery_fee,
      total,
      customer_note,
      created_at,
      updated_at,
      discount,
      restaurant_station_service_id,
      idempotency_key,
      delivery_train_stop_id
  `;

  const result = await pool.query(query, [
    status,
    id
  ]);

  return result.rows[0] || null;
};