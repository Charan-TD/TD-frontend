import {
  listRestaurants,
  getRestaurant,
  createRestaurantService,
  updateRestaurantService,
  deleteRestaurant
} from "../services/restaurant.service.js";

// GET /api/v1/restaurants
export const getRestaurants = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 20,
      status
    } = req.query;

    const result = await listRestaurants({
      page: Number(page),
      limit: Number(limit),
      status
    });

    return res.status(200).json({
      success: true,
      message: "Restaurants retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/restaurants/:id
export const getRestaurantById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const restaurant =
      await getRestaurant(id);

    return res.status(200).json({
      success: true,
      message: "Restaurant retrieved successfully",
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/restaurants
export const createRestaurant = async (
  req,
  res,
  next
) => {
  try {
    const restaurant =
      await createRestaurantService(req.body);

    return res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/restaurants/:id
export const updateRestaurant = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const restaurant =
      await updateRestaurantService(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Restaurant updated successfully",
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/restaurants/:id
export const deleteRestaurantController = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const restaurant =
      await deleteRestaurant(id);

    return res.status(200).json({
      success: true,
      message: "Restaurant deactivated successfully",
      data: restaurant
    });
  } catch (error) {
    next(error);
  }
};