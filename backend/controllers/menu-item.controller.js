import {
  createMenuItemService,
  deleteMenuItemService,
  getFoodCategoriesService,
  getMenuItemAddonsByCategoryService,
  getFoodQuantityTypesService,
  getMenuItemService,
  getRestaurantMenuItemsService,
  updateMenuItemService,
  saveFoodCategoriesService,
  getCategoryAddonsService
} from "../services/menu-item.service.js";

// Create menu item
export const createMenuItemController = async (req, res, next) => {
  try {
    const menuItem = await createMenuItemService(
      req.user.restaurant_id,
      req.body,
      req.files || []
    );

    return res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Get a single menu item
export const getMenuItemController = async (req, res, next) => {
  try {
    const menuItem = await getMenuItemService(
      req.params.id,
      req.user.restaurant_id
    );

    return res.status(200).json({
      success: true,
      message: "Menu item retrieved successfully",
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Get restaurant menu items
export const getRestaurantMenuItemsController = async (req, res, next) => {
  try {
    const menuItems = await getRestaurantMenuItemsService(
      req.query.restaurant_id
    );

    return res.status(200).json({
      success: true,
      message: "Restaurant menu items retrieved successfully",
      data: menuItems
    });
  } catch (error) {
    next(error);
  }
};

// Get root category types
export const getFoodCategoriesController = async (req, res, next) => {
  try {
    const categories = await getFoodCategoriesService(
      req.user.restaurant_id
    );

    return res.status(200).json({
      success: true,
      message: "Food categories retrieved successfully",
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const getMenuItemAddonsByCategoryController = async (
  req,
  res,
  next
) => {
  try {
    const result = await getMenuItemAddonsByCategoryService(
      req.params.categoryId,
      req.user.restaurant_id
    );

    return res.status(200).json({
      success: true,
      message: "Category add-ons retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getFoodQuantityTypesController = async (
  req,
  res,
  next
) => {
  try {
    const quantityTypes = await getFoodQuantityTypesService();

    return res.status(200).json({
      success: true,
      message: "Food quantity types retrieved successfully",
      data: quantityTypes
    });
  } catch (error) {
    next(error);
  }
};

// Save category and subcategory text inputs
export const saveFoodCategoriesController = async (req, res, next) => {
  try {
    const result = await saveFoodCategoriesService(
      req.body,
      req.user.restaurant_id
    );

    return res.status(201).json({
      success: true,
      message: "Food category values saved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// Update menu item
export const updateMenuItemController = async (req, res, next) => {
  try {
    const menuItem = await updateMenuItemService(
      req.params.id,
      req.user.restaurant_id,
      req.body,
      req.files || []
    );

    return res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Delete menu item
export const deleteMenuItemController = async (req, res, next) => {
  try {
    const menuItem = await deleteMenuItemService(
      req.params.id,
      req.user.restaurant_id
    );

    return res.status(200).json({
      success: true,
      message: "Menu item deleted successfully",
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};


export const getCategoryAddonsController = async (
  req,
  res,
  next
) => {
  try {
    const restaurantId = req.user.restaurant_id;
    const { category_id } = req.query;

    const addons = await getCategoryAddonsService(
      restaurantId,
      category_id
    );

    return res.status(200).json({
      success: true,
      message: "Category addons retrieved successfully",
      data: {
        category_id,
        total_addons: addons.length,
        addons
      }
    });
  } catch (error) {
    next(error);
  }
};
