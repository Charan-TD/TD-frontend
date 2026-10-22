
import { AppError } from "../utils/app-error.js";

import {
  findFoodCategory,
  createAddon,
  listRestaurantAddons,
  getSuggestedAddons,
  updateRestaurantAddon,
  deactivateRestaurantAddon
} from "../repositories/addon.repository.js";

const assertRestaurant = (restaurantId) => {
  if (!restaurantId) {
    throw new AppError(
      "Authenticated restaurant is required",
      401
    );
  }
};

const assertValidAddonInput = (data) => {
  if (
    typeof data.addon_name !== "string" ||
    !data.addon_name.trim()
  ) {
    throw new AppError(
      "addon_name is required",
      400
    );
  }

  if (
    typeof data.price !== "number" ||
    !Number.isFinite(data.price) ||
    data.price < 0
  ) {
    throw new AppError(
      "price must be a non-negative number",
      400
    );
  }

  if (
    data.is_available !== undefined &&
    typeof data.is_available !== "boolean"
  ) {
    throw new AppError(
      "is_available must be a boolean",
      400
    );
  }
};

export const createAddonService = async (
  restaurantId,
  data
) => {
  assertRestaurant(restaurantId);
  assertValidAddonInput(data);

  if (
    typeof data.category_id !== "string" ||
    !data.category_id.trim()
  ) {
    throw new AppError(
      "category_id is required",
      400
    );
  }

  const category = await findFoodCategory(
    data.category_id
  );

  if (!category) {
    throw new AppError(
      "Food category not found",
      404
    );
  }

  try {
    return await createAddon(restaurantId, {
      category_id: category.category_id,
      addon_name: data.addon_name.trim(),
      price: data.price,
      is_available: data.is_available ?? true
    });
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "An addon with this name already exists in this category",
        409
      );
    }

    throw error;
  }
};

export const listAddonsService = async (
  restaurantId
) => {
  assertRestaurant(restaurantId);

  return listRestaurantAddons(restaurantId);
};

export const suggestAddonsService = async (
  restaurantId,
  categoryId
) => {
  assertRestaurant(restaurantId);

  if (!categoryId) {
    throw new AppError(
      "categoryId is required",
      400
    );
  }

  const category = await findFoodCategory(categoryId);

  if (!category) {
    throw new AppError(
      "Food category not found",
      404
    );
  }

  return getSuggestedAddons(
    restaurantId,
    categoryId
  );
};

export const updateAddonService = async (
  restaurantId,
  addonId,
  data
) => {
  assertRestaurant(restaurantId);

  const allowedFields = [
    "addon_name",
    "price",
    "is_available",
    "category_id"
  ];

  const updateData = Object.fromEntries(
    allowedFields
      .filter((field) => data[field] !== undefined)
      .map((field) => [field, data[field]])
  );

  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      "No valid fields provided",
      400
    );
  }

  if (updateData.addon_name !== undefined) {
    if (
      typeof updateData.addon_name !== "string" ||
      !updateData.addon_name.trim()
    ) {
      throw new AppError(
        "addon_name cannot be empty",
        400
      );
    }

    updateData.addon_name =
      updateData.addon_name.trim();
  }

  if (
    updateData.price !== undefined &&
    (
      typeof updateData.price !== "number" ||
      !Number.isFinite(updateData.price) ||
      updateData.price < 0
    )
  ) {
    throw new AppError(
      "Invalid addon price",
      400
    );
  }

  if (
    updateData.is_available !== undefined &&
    typeof updateData.is_available !== "boolean"
  ) {
    throw new AppError(
      "is_available must be a boolean",
      400
    );
  }

  if (updateData.category_id !== undefined) {
    const category = await findFoodCategory(
      updateData.category_id
    );

    if (!category) {
      throw new AppError(
        "Food category not found",
        404
      );
    }
  }

  try {
    const addon = await updateRestaurantAddon(
      restaurantId,
      addonId,
      updateData
    );

    if (!addon) {
      throw new AppError(
        "Addon not found",
        404
      );
    }

    return addon;
  } catch (error) {
    if (error.code === "23505") {
      throw new AppError(
        "An addon with this name already exists in this category",
        409
      );
    }

    throw error;
  }
};

export const deleteAddonService = async (
  restaurantId,
  addonId
) => {
  assertRestaurant(restaurantId);

  const addon = await deactivateRestaurantAddon(
    restaurantId,
    addonId
  );

  if (!addon) {
    throw new AppError(
      "Addon not found",
      404
    );
  }

  return addon;
};
