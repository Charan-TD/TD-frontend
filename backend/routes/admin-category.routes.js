import express from "express";

import {
  getAdminCategories,
  createAdminCategory
} from "../controllers/admin-category.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/categories:
 *   get:
 *     summary: List admin food categories
 *     description: Returns the food categories created by admins (not tied to a restaurant).
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authenticate,
  authorize("restaurants", "read"),
  getAdminCategories
);

/**
 * @swagger
 * /api/v1/admin/categories:
 *   post:
 *     summary: Create an admin food category
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Biryani
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid category name
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Category already exists
 */
router.post(
  "/",
  authenticate,
  authorize("restaurants", "insert"),
  createAdminCategory
);

export default router;
