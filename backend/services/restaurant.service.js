import {
  getRestaurants,
  findRestaurantById,
  findRestaurantByPan,
  findRestaurantByGstin,
  createRestaurant,
  updateRestaurant,
  deactivateRestaurant
} from "../repositories/restaurant.repository.js";

import { AppError } from "../utils/app-error.js";

const ALLOWED_STATUSES = [
  "ACTIVE",
  "INACTIVE"
];

// List restaurants
export const listRestaurants = async ({
  page = 1,
  limit = 20,
  status
}) => {
  const result = await getRestaurants({
    page,
    limit,
    status
  });

  return {
    restaurants: result.rows,
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

// Get restaurant by ID
export const getRestaurant = async (id) => {
  const restaurant =
    await findRestaurantById(id);

  if (!restaurant) {
    throw new AppError(
      "Restaurant not found",
      404
    );
  }

  return restaurant;
};

// Create restaurant
export const createRestaurantService = async (
  data
) => {
  const {
    name,
    business_type,
    pan,
    gstin
  } = data;

  if (!name || name.trim().length === 0) {
    throw new AppError(
      "Restaurant name is required",
      400
    );
  }

  if (
    !business_type ||
    business_type.trim().length === 0
  ) {
    throw new AppError(
      "Business type is required",
      400
    );
  }

  // Check duplicate PAN
  if (pan) {
    const existingPan =
      await findRestaurantByPan(pan);

    if (existingPan) {
      throw new AppError(
        "Restaurant with this PAN already exists",
        409
      );
    }
  }

  // Check duplicate GSTIN
  if (gstin) {
    const existingGstin =
      await findRestaurantByGstin(gstin);

    if (existingGstin) {
      throw new AppError(
        "Restaurant with this GSTIN already exists",
        409
      );
    }
  }

  return await createRestaurant(data);
};

// Update restaurant
export const updateRestaurantService = async (
  id,
  data
) => {
  const existingRestaurant =
    await findRestaurantById(id);

  if (!existingRestaurant) {
    throw new AppError(
      "Restaurant not found",
      404
    );
  }

  if (
    data.name !== undefined &&
    (!data.name ||
      data.name.trim().length === 0)
  ) {
    throw new AppError(
      "Restaurant name cannot be empty",
      400
    );
  }

  if (
    data.business_type !== undefined &&
    (!data.business_type ||
      data.business_type.trim().length === 0)
  ) {
    throw new AppError(
      "Business type cannot be empty",
      400
    );
  }

  // Check duplicate PAN
  if (
    data.pan &&
    data.pan !== existingRestaurant.pan
  ) {
    const existingPan =
      await findRestaurantByPan(data.pan);

    if (
      existingPan &&
      existingPan.id !== id
    ) {
      throw new AppError(
        "Restaurant with this PAN already exists",
        409
      );
    }
  }

  // Check duplicate GSTIN
  if (
    data.gstin &&
    data.gstin !== existingRestaurant.gstin
  ) {
    const existingGstin =
      await findRestaurantByGstin(data.gstin);

    if (
      existingGstin &&
      existingGstin.id !== id
    ) {
      throw new AppError(
        "Restaurant with this GSTIN already exists",
        409
      );
    }
  }

  return await updateRestaurant(
    id,
    data
  );
};

// Deactivate restaurant
export const deleteRestaurant = async (
  id
) => {
  const existingRestaurant =
    await findRestaurantById(id);

  if (!existingRestaurant) {
    throw new AppError(
      "Restaurant not found",
      404
    );
  }

  if (
    existingRestaurant.status === "INACTIVE"
  ) {
    throw new AppError(
      "Restaurant is already inactive",
      409
    );
  }

  return await deactivateRestaurant(id);
};