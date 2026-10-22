
import { Router } from "express";

import {
  createAddonController,
  listAddonsController,
  suggestAddonsController,
  updateAddonController,
  deleteAddonController
} from "../controllers/addon.controller.js";

const router = Router();

/*
 * Authentication is applied when mounting
 * this router in app.js.
 */

/**
 * @swagger
 * /api/v1/addons:
 *   post:
 *     summary: Create a restaurant add-on
 *     description: Creates an add-on owned by the authenticated restaurant.
 *     tags: [Restaurant Add-ons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category_id, addon_name, price]
 *             properties:
 *               category_id:
 *                 type: string
 *                 description: ID of an active food category
 *               addon_name:
 *                 type: string
 *                 example: Extra cheese
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 example: 30
 *               is_available:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Add-on created successfully
 *       400:
 *         description: Invalid or missing add-on fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Food category not found
 *       409:
 *         description: An add-on with this name already exists in the category
 */
router.post(
  "/addons",
  createAddonController
);

/**
 * @swagger
 * /api/v1/addons:
 *   get:
 *     summary: List restaurant add-ons
 *     description: Lists add-ons belonging to the authenticated restaurant.
 *     tags: [Restaurant Add-ons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Add-ons retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/addons",
  listAddonsController
);

/**
 * @swagger
 * /api/v1/menu-items/categories/{categoryId}/addons:
 *   get:
 *     summary: Suggest add-ons for a food category
 *     description: >
 *       Returns available add-ons from the selected category, its
 *       descendants, and its non-root ancestors for the authenticated
 *       restaurant.
 *     tags: [Restaurant Add-ons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Food category ID
 *     responses:
 *       200:
 *         description: Suggested add-ons retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Food category not found
 */
router.get(
  "/menu-items/categories/:categoryId/addons",
  suggestAddonsController
);

/**
 * @swagger
 * /api/v1/addons/{addonId}:
 *   patch:
 *     summary: Update a restaurant add-on
 *     description: Updates the specified add-on owned by the authenticated restaurant.
 *     tags: [Restaurant Add-ons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Add-on ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               addon_name:
 *                 type: string
 *               price:
 *                 type: number
 *                 minimum: 0
 *               is_available:
 *                 type: boolean
 *               category_id:
 *                 type: string
 *                 description: ID of an active food category
 *     responses:
 *       200:
 *         description: Add-on updated successfully
 *       400:
 *         description: Invalid update fields
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Add-on or food category not found
 *       409:
 *         description: An add-on with this name already exists in the category
 */
router.patch(
  "/addons/:addonId",
  updateAddonController
);

/**
 * @swagger
 * /api/v1/addons/{addonId}:
 *   delete:
 *     summary: Deactivate a restaurant add-on
 *     description: Marks the specified add-on as unavailable.
 *     tags: [Restaurant Add-ons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: addonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Add-on ID
 *     responses:
 *       200:
 *         description: Add-on deactivated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Add-on not found
 */
router.delete(
  "/addons/:addonId",
  deleteAddonController
);

export default router;
