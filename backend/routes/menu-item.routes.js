import express from "express";
import {
  createMenuItemController,
  deleteMenuItemController,
  getFoodCategoriesController,
  getMenuItemAddonsByCategoryController,
  getFoodQuantityTypesController,
  getMenuItemController,
  getRestaurantMenuItemsController,
  updateMenuItemController,
  saveFoodCategoriesController,
  getCategoryAddonsController
} from "../controllers/menu-item.controller.js";
import { authenticateRestaurant } from "../middleware/restaurantAuthenticate.js";
import {
  normalizeMenuItemMultipart,
  uploadMenuItemImages
} from "../middleware/menu-item-upload.js";
import {
  validateCreateMenuItem,
  validateMenuItemId,
  validateRestaurantMenuItemsQuery,
  validateUpdateMenuItem
} from "../validators/menu-item.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Menu Items
 *   description: Menu item management
 */

/**
 * @swagger
 * /api/v1/menu-items:
 *   post:
 *     summary: Create a menu item
 *     description: |
 *       The restaurant_id is taken from the authenticated restaurant account
 *       and must not be supplied in the request body. Category and sub_category
 *       names are saved to food_categories first; the generated subcategory ID
 *       (or category ID when no subcategory is provided) is stored as
 *       restaurant_menu_items.category_id. To associate add-ons, provide the
 *       add-on IDs returned by GET /api/v1/addons in the addons array.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/MenuItemCreateMultipart'
 *           encoding:
 *             img_id:
 *               contentType: image/jpeg, image/webp
 *             addons:
 *               contentType: application/json
 *     responses:
 *       201:
 *         description: Menu item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemSuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       413:
 *         description: Image exceeds the 2 MB upload limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       500:
 *         description: Image storage or database operation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 */
router.post(
  "/",
  authenticateRestaurant,
  uploadMenuItemImages,
  normalizeMenuItemMultipart,
  validateCreateMenuItem,
  createMenuItemController
);

/**
 * @swagger
 * /api/v1/menu-items:
 *   get:
 *     summary: Get all menu items for the authenticated restaurant
 *     description: Returns menu items filtered by the restaurant ID resolved from the restaurant access token.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: restaurant_id
 *         required: true
 *         description: Restaurant UUID. Must match the restaurant associated with the access token.
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Restaurant menu items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Restaurant menu items retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MenuItemRead'
 *             example:
 *               success: true
 *               message: Restaurant menu items retrieved successfully
 *               data:
 *                 - id: 550e8400-e29b-41d4-a716-446655440000
 *                   restaurant_id: 650e8400-e29b-41d4-a716-446655440000
 *                   name: Hyderabadi Chicken Dum Biryani
 *                   description: Slow-cooked chicken biryani
 *                   price: 250
 *                   tax_rate: 0
 *                   preparation_time_minutes: 26
 *                   owner_is_available: true
 *                   created_at: '2026-10-10T07:38:17.328Z'
 *                   category_id: SUB002
 *                   img_urls: [https://example.com/signed-menu-item-image]
 *                   quantity: 20
 *                   low_stock_threshold: 5
 *                   admin_is_available: null
 *                   admin_item_inactive_reason: null
 *                   discounted_price: null
 *                   qty_type: null
 *                   food_served: non_veg
 *                   addons: [750e8400-e29b-41d4-a716-446655440000]
 *       401:
 *         description: Missing or invalid restaurant access token
 *       400:
 *         description: Missing or invalid restaurant_id
 *       403:
 *         description: Restaurant account is inactive, unlinked, or the requested ID belongs to another restaurant
 *       500:
 *         description: Database operation failed
 */
router.get(
  "/",
  authenticateRestaurant,
  validateRestaurantMenuItemsQuery,
  getRestaurantMenuItemsController
);

/**
 * @swagger
 * /api/v1/menu-items/categories:
 *   get:
 *     summary: Get food categories for the authenticated restaurant
 *     description: Returns categories assigned to the restaurant in the access token, including its assigned subcategories and menu-item categories.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Food categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Food categories retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *                   example:
 *                     - id: 1
 *                       category_id: CAT002
 *                       category_name: Biryani
 *                       parent_id: CAT001
 *                       level: 1
 *                       is_active: true
 *                     - id: 3
 *                       category_id: SUB002
 *                       category_name: Chicken Biryani
 *                       parent_id: CAT002
 *                       level: 2
 *                       is_active: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/categories",
  authenticateRestaurant,
  getFoodCategoriesController
);

/**
 * @swagger
 * /api/v1/menu-items/categories/{categoryId}/addons:
 *   get:
 *     summary: Get add-ons used by menu items in a category
 *     description: Returns distinct add-ons used by this restaurant's menu items assigned to the selected category or its descendants.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         description: Level-1 food category ID from GET /api/v1/menu-items/categories.
 *         schema:
 *           type: string
 *           example: CAT002
 *     responses:
 *       200:
 *         description: Category add-ons retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Category add-ons retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     category_id:
 *                       type: string
 *                       example: CAT002
 *                     category_name:
 *                       type: string
 *                       example: Biryani
 *                     addons:
 *                       type: array
 *                       description: Distinct JSON values assigned to menu items under the selected category.
 *                       items: {}
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
router.get(
  "/categories/:categoryId/addons",
  authenticateRestaurant,
  getMenuItemAddonsByCategoryController
);

/**
 * @swagger
 * /api/v1/menu-items/qty-types:
 *   get:
 *     summary: Get available food quantity types
 *     description: Returns quantity type IDs, names, and statuses from food_qty_type.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Food quantity types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Food quantity types retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required: [qty_type_id, qty_type_name, status]
 *                     properties:
 *                       qty_type_id:
 *                         type: string
 *                         example: QTY001
 *                       qty_type_name:
 *                         type: string
 *                         example: Plate
 *                       status:
 *                         type: string
 *                         example: ACTIVE
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Database operation failed
 */
router.get(
  "/qty-types",
  authenticateRestaurant,
  getFoodQuantityTypesController
);


/**
 * @swagger
 * /api/v1/menu-items/categories:
 *   post:
 *     summary: Add one or more categories and subcategories
 *     description: |
 *       The restaurant is resolved from the authenticated restaurant access token;
 *       do not send a restaurant_id in the body. The legacy category/subcategory
 *       fields remain supported. To submit multiple categories, provide categories
 *       as an array; each entry may include multiple subcategories.
 *
 *       Category entries are saved under CAT001 at level 1. Their subcategories
 *       are saved under the category at level 2 and are visible only to this
 *       restaurant through GET /api/v1/menu-items/categories.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 maxLength: 255
 *                 example: Biryani
 *               subcategory:
 *                 type: string
 *                 maxLength: 255
 *                 example: Chicken Biryani
 *               categories:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [category]
 *                   properties:
 *                     category:
 *                       type: string
 *                       maxLength: 255
 *                     subcategories:
 *                       type: array
 *                       items:
 *                         type: string
 *                         maxLength: 255
 *           example:
 *             categories:
 *               - category: Biryani
 *                 subcategories: [Chicken Biryani, Mutton Biryani]
 *               - category: Beverages
 *                 subcategories: [Juices, Soft Drinks]
 *     responses:
 *       201:
 *         description: Food category values saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Food category values saved successfully
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         categories:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               category:
 *                                 type: object
 *                               subcategories:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                     - type: object
 *                       properties:
 *                         category:
 *                           type: object
 *                           nullable: true
 *                         subcategory:
 *                           type: object
 *                           nullable: true
 *             example:
 *               success: true
 *               message: Food category values saved successfully
 *               data:
 *                 categories:
 *                   - category:
 *                       category_id: CAT002
 *                       category_name: Biryani
 *                       parent_id: CAT001
 *                       level: 1
 *                       is_active: true
 *                     subcategories:
 *                       - category_id: SUB002
 *                         category_name: Chicken Biryani
 *                         parent_id: CAT002
 *                         level: 2
 *                         is_active: true
 *                       - category_id: SUB003
 *                         category_name: Mutton Biryani
 *                         parent_id: CAT002
 *                         level: 2
 *                         is_active: true
 *                   - category:
 *                       category_id: CAT003
 *                       category_name: Beverages
 *                       parent_id: CAT001
 *                       level: 1
 *                       is_active: true
 *                     subcategories:
 *                       - category_id: SUB004
 *                         category_name: Juices
 *                         parent_id: CAT003
 *                         level: 2
 *                         is_active: true
 *       400:
 *         description: Invalid category or subcategory input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Database operation failed
 */
router.post(
  "/categories",
  authenticateRestaurant,
  saveFoodCategoriesController
);

/**
 * @swagger
 * /api/v1/menu-items/category-addons:
 *   get:
 *     summary: Get addon suggestions for a selected category
 *     tags:
 *       - Menu Items
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category_id
 *         required: true
 *         schema:
 *           type: string
 *         example: CAT002
 *         description: Existing food category ID
 *     responses:
 *       200:
 *         description: Related addons retrieved successfully
 *       400:
 *         description: Missing category ID
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/category-addons",
  authenticateRestaurant,
  getCategoryAddonsController
);

/**
 * @swagger
 * /api/v1/menu-items/{id}:
 *   get:
 *     summary: Get a menu item by ID for the authenticated restaurant
 *     description: The addons field contains the add-on IDs associated with the menu item.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Menu item retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemReadSuccessResponse'
 *       400:
 *         description: Invalid menu item ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       500:
 *         description: Database operation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 */
router.get(
  "/:id",
  authenticateRestaurant,
  validateMenuItemId,
  getMenuItemController
);

/**
 * @swagger
 * /api/v1/menu-items/{id}:
 *   patch:
 *     summary: Update a menu item owned by the authenticated restaurant
 *     description: Provide add-on IDs returned by GET /api/v1/addons in the addons array to replace the menu item's add-ons.
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/MenuItemPatchMultipart'
 *           encoding:
 *             img_id:
 *               contentType: image/jpeg, image/webp
 *             addons:
 *               contentType: application/json
 *     responses:
 *       200:
 *         description: Menu item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemSuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       413:
 *         description: Image exceeds the 2 MB upload limit
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       500:
 *         description: Image storage or database operation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 */
router.patch(
  "/:id",
  authenticateRestaurant,
  validateMenuItemId,
  uploadMenuItemImages,
  normalizeMenuItemMultipart,
  validateUpdateMenuItem,
  updateMenuItemController
);

/**
 * @swagger
 * /api/v1/menu-items/{id}:
 *   delete:
 *     summary: Delete a menu item owned by the authenticated restaurant
 *     tags: [Menu Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Menu item deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemSuccessResponse'
 *       400:
 *         description: Invalid menu item ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       404:
 *         description: Menu item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 *       500:
 *         description: Image storage or database operation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MenuItemErrorResponse'
 */
router.delete(
  "/:id",
  authenticateRestaurant,
  validateMenuItemId,
  deleteMenuItemController
);

export default router;
