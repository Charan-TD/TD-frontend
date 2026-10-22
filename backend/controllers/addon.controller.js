
import {
  createAddonService,
  listAddonsService,
  suggestAddonsService,
  updateAddonService,
  deleteAddonService
} from "../services/addon.service.js";

/*
 * Use the restaurant identity established by your
 * existing authentication middleware.
 *
 * Adjust this helper if your middleware stores the
 * restaurant ID under a different property.
 */
const getRestaurantId = (req) =>
  req.restaurant?.restaurant_id ??
  req.restaurant?.id ??
  null;

export const createAddonController = async (
  req,
  res,
  next
) => {
  try {
    const addon = await createAddonService(
      getRestaurantId(req),
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Addon created successfully",
      data: addon
    });
  } catch (error) {
    next(error);
  }
};

export const listAddonsController = async (
  req,
  res,
  next
) => {
  try {
    const addons = await listAddonsService(
      getRestaurantId(req)
    );

    return res.status(200).json({
      success: true,
      data: {
        total_addons: addons.length,
        addons
      }
    });
  } catch (error) {
    next(error);
  }
};

export const suggestAddonsController = async (
  req,
  res,
  next
) => {
  try {
    const { categoryId } = req.params;

    const addons = await suggestAddonsService(
      getRestaurantId(req),
      categoryId
    );

    return res.status(200).json({
      success: true,
      message: "Suggested addons retrieved successfully",
      data: {
        category_id: categoryId,
        total_addons: addons.length,
        addons
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateAddonController = async (
  req,
  res,
  next
) => {
  try {
    const addon = await updateAddonService(
      getRestaurantId(req),
      req.params.addonId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Addon updated successfully",
      data: addon
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAddonController = async (
  req,
  res,
  next
) => {
  try {
    const addon = await deleteAddonService(
      getRestaurantId(req),
      req.params.addonId
    );

    return res.status(200).json({
      success: true,
      message: "Addon deactivated successfully",
      data: addon
    });
  } catch (error) {
    next(error);
  }
};
