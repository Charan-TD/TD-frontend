import crypto from "crypto";
import supabase from "../config/supabase.js";
import {
  createMenuItem,
  deleteMenuItem,
  getFoodCategories,
  getMenuItemAddonsByCategory,
  getFoodQuantityTypes,
  findMenuItemsByRestaurantId,
  findMenuItemById,
  updateMenuItem,
  saveFoodCategories,
  getCategoryRelatedAddons
} from "../repositories/menu-item.repository.js";
import {
  generateSignedUrl,
  StorageObjectNotFoundError
} from "./storage.service.js";
import { AppError } from "../utils/app-error.js";

const MENU_ITEM_IMAGE_BUCKET = "menu_item_images";
const MIME_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/webp": ".webp"
};

const uploadMenuItemImages = async (files) => {
  const imageIds = [];

  for (const file of files) {
    const extension = MIME_EXTENSIONS[file.mimetype];
    const imageId = `menu-items/${crypto.randomUUID()}${extension}`;
    const { error } = await supabase.storage
      .from(MENU_ITEM_IMAGE_BUCKET)
      .upload(imageId, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error("Menu item image upload failed:", error);
      try {
        await removeMenuItemImages(imageIds);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up images after upload failed:",
          cleanupError
        );
      }
      throw new AppError("Failed to upload menu item image", 500);
    }

    imageIds.push(imageId);
  }

  return imageIds;
};

const removeMenuItemImages = async (imageIds) => {
  if (imageIds.length === 0) return;

  const { error } = await supabase.storage
    .from(MENU_ITEM_IMAGE_BUCKET)
    .remove(imageIds);

  if (error) {
    console.error("Menu item image cleanup failed:", error);
    throw new AppError("Failed to clean up menu item images", 500);
  }
};

const getImageIds = (menuItem) => {
  if (!menuItem?.img_id) return [];

  if (Array.isArray(menuItem.img_id)) {
    return menuItem.img_id;
  }

  try {
    const parsed = JSON.parse(menuItem.img_id);
    return Array.isArray(parsed) ? parsed : [menuItem.img_id];
  } catch {
    return [menuItem.img_id];
  }
};

const addSignedImageUrls = async (menuItem) => {
  if (!menuItem) return menuItem;

  const imageIds = getImageIds(menuItem);
  const imageUrls = await Promise.all(
    imageIds.map(async (imageId) => {
      try {
        return await generateSignedUrl(
          MENU_ITEM_IMAGE_BUCKET,
          imageId
        );
      } catch (error) {
        if (!(error instanceof StorageObjectNotFoundError)) {
          throw error;
        }

        console.warn(
          "Menu item image not found in storage:",
          { imageId, menuItemId: menuItem.id }
        );
        return null;
      }
    })
  );

  return {
    ...menuItem,
    img_urls: imageUrls
  };
};

const getMenuItemWithSignedImageUrls = async (menuItem) => {
  const { img_id, ...menuItemWithoutImageIds } =
    await addSignedImageUrls(menuItem);

  return menuItemWithoutImageIds;
};

export const createMenuItemService = async (
  restaurantId,
  data,
  files = []
) => {
  const imageIds = await uploadMenuItemImages(files);

  let menuItem;
  try {
    menuItem = await createMenuItem({
      ...data,
      restaurant_id: restaurantId,
      img_id: imageIds.length > 0
        ? JSON.stringify(imageIds)
        : undefined
    });
  } catch (error) {
    try {
      await removeMenuItemImages(imageIds);
    } catch (cleanupError) {
      console.error(
        "Failed to remove uploaded images after menu item creation failed:",
        cleanupError
      );
    }
    throw error;
  }

  return addSignedImageUrls(menuItem);
};

export const getMenuItemService = async (id, restaurantId) => {
  const menuItem = await findMenuItemById(id, restaurantId);

  if (!menuItem) {
    throw new AppError("Menu item not found", 404);
  }

  return getMenuItemWithSignedImageUrls(menuItem);
};

export const getRestaurantMenuItemsService = async (restaurantId) => {
  const menuItems = await findMenuItemsByRestaurantId(restaurantId);
  return Promise.all(
    menuItems.map(getMenuItemWithSignedImageUrls)
  );
};

export const getFoodCategoriesService = async (restaurantId) =>
  getFoodCategories(restaurantId);

export const getMenuItemAddonsByCategoryService = async (
  categoryId,
  restaurantId
) => getMenuItemAddonsByCategory(categoryId, restaurantId);

export const getFoodQuantityTypesService = async () =>
  getFoodQuantityTypes();

export const saveFoodCategoriesService = async (
  data,
  restaurantId
) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Request body must be a JSON object", 400);
  }

  const isBatch = Array.isArray(data.categories);
  const categories = isBatch
    ? data.categories
    : [{
      category: data.category,
      subcategories: typeof data.subcategory !== "string" ||
        !data.subcategory.trim()
        ? []
        : [data.subcategory]
    }];

  if (categories.length === 0) {
    throw new AppError("At least one category is required", 400);
  }

  const normalizedCategories = categories.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AppError(
        `categories[${index}] must be an object`,
        400
      );
    }

    const categoryName =
      typeof item.category === "string" ? item.category.trim() : "";
    const subcategories = item.subcategories ?? [];

    if (!categoryName) {
      throw new AppError(
        `categories[${index}].category is required`,
        400
      );
    }

    if (categoryName.length > 255) {
      throw new AppError(
        "Category and subcategory names must not exceed 255 characters",
        400
      );
    }

    if (!Array.isArray(subcategories)) {
      throw new AppError(
        `categories[${index}].subcategories must be an array`,
        400
      );
    }

    const normalizedSubcategories = subcategories.map(
      (subcategory, subcategoryIndex) => {
        if (
          typeof subcategory !== "string" ||
          !subcategory.trim() ||
          subcategory.trim().length > 255
        ) {
          throw new AppError(
            `categories[${index}].subcategories[${subcategoryIndex}] must be a non-empty string of at most 255 characters`,
            400
          );
        }

        return subcategory.trim();
      }
    );

    return {
      category: categoryName,
      subcategories: normalizedSubcategories
    };
  });

  const savedCategories = await saveFoodCategories({
    restaurantId,
    categories: normalizedCategories
  });

  if (isBatch) {
    return { categories: savedCategories };
  }

  return {
    category: savedCategories[0]?.category ?? null,
    subcategory: savedCategories[0]?.subcategories[0] ?? null
  };
};

export const updateMenuItemService = async (
  id,
  restaurantId,
  data,
  files = []
) => {
  const currentMenuItem = await findMenuItemById(id, restaurantId);

  if (!currentMenuItem) {
    throw new AppError("Menu item not found", 404);
  }

  const newImageIds = await uploadMenuItemImages(files);
  const updateData = files.length > 0
    ? { ...data, img_id: JSON.stringify(newImageIds) }
    : data;

  let menuItem;
  try {
    menuItem = await updateMenuItem(id, restaurantId, updateData);
  } catch (error) {
    try {
      await removeMenuItemImages(newImageIds);
    } catch (cleanupError) {
      console.error(
        "Failed to remove uploaded images after menu item update failed:",
        cleanupError
      );
    }
    throw error;
  }

  if (!menuItem) {
    try {
      await removeMenuItemImages(newImageIds);
    } catch (cleanupError) {
      console.error(
        "Failed to remove uploaded images after menu item disappeared during update:",
        cleanupError
      );
    }
    throw new AppError("Menu item not found", 404);
  }

  if (files.length > 0) {
    await removeMenuItemImages(getImageIds(currentMenuItem));
  }

  return addSignedImageUrls(menuItem);
};

export const deleteMenuItemService = async (id, restaurantId) => {
  const currentMenuItem = await findMenuItemById(id, restaurantId);

  if (!currentMenuItem) {
    throw new AppError("Menu item not found", 404);
  }

  const menuItem = await deleteMenuItem(id, restaurantId);

  if (!menuItem) {
    throw new AppError("Menu item not found", 404);
  }

  await removeMenuItemImages(getImageIds(menuItem));

  return menuItem;
};


export const getCategoryAddonsService = async (
  restaurantId,
  categoryId
) => {
  if (!restaurantId) {
    throw new AppError(
      "Restaurant ID is required",
      400
    );
  }

  if (!categoryId) {
    throw new AppError(
      "Category ID is required",
      400
    );
  }

  return getCategoryRelatedAddons(
    restaurantId,
    categoryId
  );
};
