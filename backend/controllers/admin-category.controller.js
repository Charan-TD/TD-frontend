import {
  listAdminFoodCategories,
  createAdminFoodCategory
} from "../repositories/menu-item.repository.js";

import { AppError } from "../utils/app-error.js";

const CATEGORY_NAME_MAX = 100;

// GET /api/v1/admin/categories
export const getAdminCategories = async (req, res, next) => {
  try {
    const categories = await listAdminFoodCategories();

    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/admin/categories
export const createAdminCategory = async (req, res, next) => {
  try {
    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!name) {
      throw new AppError("Category name is required", 400);
    }

    if (name.length > CATEGORY_NAME_MAX) {
      throw new AppError(
        `Category name must not exceed ${CATEGORY_NAME_MAX} characters`,
        400
      );
    }

    const category = await createAdminFoodCategory(name);

    if (!category) {
      throw new AppError("This category already exists", 409);
    }

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (error) {
    next(error);
  }
};
