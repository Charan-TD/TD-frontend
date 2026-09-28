import {
  getOrders,
  findOrderById,
  findOrderByIdempotencyKey,
  getOrdersByCustomerId,
  createOrder,
  updateOrder,
  updateOrderStatus
} from "../repositories/order.repository.js";

import { AppError } from "../utils/app-error.js";

const ALLOWED_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED"
];

export const listOrders = async ({
  page = 1,
  limit = 20,
  status
}) => {
  if (
    status &&
    !ALLOWED_STATUSES.includes(status.toUpperCase())
  ) {
    throw new AppError(
      "Invalid order status",
      400
    );
  }

  const result = await getOrders({
    page,
    limit,
    status: status?.toUpperCase()
  });

  return {
    orders: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: result.total,
      totalPages: Math.ceil(
        result.total / Number(limit)
      )
    }
  };
};

export const getOrder = async (id) => {
  const order = await findOrderById(id);

  if (!order) {
    throw new AppError(
      "Order not found",
      404
    );
  }

  return order;
};

export const listCustomerOrders = async (
  customerUserId,
  { page = 1, limit = 20 }
) => {
  const result = await getOrdersByCustomerId(
    customerUserId,
    {
      page,
      limit
    }
  );

  return {
    orders: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: result.total,
      totalPages: Math.ceil(
        result.total / Number(limit)
      )
    }
  };
};

export const createNewOrder = async (data) => {
  const {
    customer_user_id,
    train_id,
    journey_date,
    boarding_station_id,
    is_deliverable,
    subtotal,
    total,
    restaurant_station_service_id,
    idempotency_key,
    status
  } = data;

  if (!customer_user_id) {
    throw new AppError(
      "Customer user ID is required",
      400
    );
  }

  if (!train_id) {
    throw new AppError(
      "Train ID is required",
      400
    );
  }

  if (!journey_date) {
    throw new AppError(
      "Journey date is required",
      400
    );
  }

  if (!boarding_station_id) {
    throw new AppError(
      "Boarding station ID is required",
      400
    );
  }

  if (
    typeof is_deliverable !== "boolean"
  ) {
    throw new AppError(
      "is_deliverable must be a boolean",
      400
    );
  }

  if (
    subtotal === undefined ||
    subtotal === null
  ) {
    throw new AppError(
      "Subtotal is required",
      400
    );
  }

  if (
    total === undefined ||
    total === null
  ) {
    throw new AppError(
      "Total is required",
      400
    );
  }

  if (!restaurant_station_service_id) {
    throw new AppError(
      "Restaurant station service ID is required",
      400
    );
  }

  if (
    status &&
    !ALLOWED_STATUSES.includes(
      status.toUpperCase()
    )
  ) {
    throw new AppError(
      "Invalid order status",
      400
    );
  }

  if (idempotency_key) {
    const existingOrder =
      await findOrderByIdempotencyKey(
        idempotency_key
      );

    if (existingOrder) {
      return existingOrder;
    }
  }

  return await createOrder({
    ...data,
    status: status?.toUpperCase()
  });
};

export const updateExistingOrder = async (
  id,
  data
) => {
  const existingOrder =
    await findOrderById(id);

  if (!existingOrder) {
    throw new AppError(
      "Order not found",
      404
    );
  }

  if (
    data.status &&
    !ALLOWED_STATUSES.includes(
      data.status.toUpperCase()
    )
  ) {
    throw new AppError(
      "Invalid order status",
      400
    );
  }

  return await updateOrder(id, {
    ...data,
    status: data.status?.toUpperCase()
  });
};

export const changeOrderStatus = async (
  id,
  status
) => {
  const existingOrder =
    await findOrderById(id);

  if (!existingOrder) {
    throw new AppError(
      "Order not found",
      404
    );
  }

  if (
    !status ||
    !ALLOWED_STATUSES.includes(
      status.toUpperCase()
    )
  ) {
    throw new AppError(
      "Invalid order status",
      400
    );
  }

  const normalizedStatus =
    status.toUpperCase();

  if (
    existingOrder.status ===
    normalizedStatus
  ) {
    throw new AppError(
      `Order is already ${normalizedStatus}`,
      409
    );
  }

  return await updateOrderStatus(
    id,
    normalizedStatus
  );
};