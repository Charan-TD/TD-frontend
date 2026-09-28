import express from "express";

import {
  getRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurantController
} from "../controllers/restaurant.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateRestaurantList,
  validateRestaurantId,
  validateCreateRestaurant,
  validateUpdateRestaurant
} from "../validators/restaurant.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Restaurants
 *   description: Restaurant management APIs
 */

/**
 * @swagger
 * /api/v1/restaurants:
 *   get:
 *     summary: Get restaurants
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Restaurants retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authenticate,
  authorize("restaurants", "read"),
  validateRestaurantList,
  getRestaurants
);

/**
 * @swagger
 * /api/v1/restaurants/{id}:
 *   get:
 *     summary: Get restaurant by ID
 *     tags: [Restaurants]
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
 *         description: Restaurant retrieved successfully
 *       400:
 *         description: Invalid restaurant ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("restaurants", "read"),
  validateRestaurantId,
  getRestaurantById
);

/**
 * @swagger
 * /api/v1/restaurants:
 *   post:
 *     summary: Create restaurant
 *     tags: [Restaurants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - business_type
 *             properties:
 *               name:
 *                 type: string
 *               business_type:
 *                 type: string
 *               legal_name:
 *                 type: string
 *               pan:
 *                 type: string
 *               gstin:
 *                 type: string
 *               fssai_number:
 *                 type: string
 *               fssai_valid_until:
 *                 type: string
 *                 format: date
 *               bank_account_number:
 *                 type: string
 *               bank_ifsc:
 *                 type: string
 *               bank_account_holder:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *             example:
 *               name: "Railway Spice Kitchen"
 *               business_type: "RESTAURANT"
 *               legal_name: "Railway Spice Kitchen Pvt Ltd"
 *               pan: "ABCDE1234F"
 *               gstin: "36ABCDE1234F1Z5"
 *               fssai_number: "12345678901234"
 *               fssai_valid_until: "2027-12-31"
 *               bank_account_number: "1234567890"
 *               bank_ifsc: "SBIN0001234"
 *               bank_account_holder: "Railway Spice Kitchen Pvt Ltd"
 *               status: "ACTIVE"
 *     responses:
 *       201:
 *         description: Restaurant created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Restaurant already exists
 */
router.post(
  "/",
  authenticate,
  authorize("restaurants", "insert"),
  validateCreateRestaurant,
  createRestaurant
);

/**
 * @swagger
 * /api/v1/restaurants/{id}:
 *   put:
 *     summary: Update restaurant
 *     tags: [Restaurants]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               business_type:
 *                 type: string
 *               legal_name:
 *                 type: string
 *               pan:
 *                 type: string
 *               gstin:
 *                 type: string
 *               fssai_number:
 *                 type: string
 *               fssai_valid_until:
 *                 type: string
 *                 format: date
 *               bank_account_number:
 *                 type: string
 *               bank_ifsc:
 *                 type: string
 *               bank_account_holder:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Restaurant updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 *       409:
 *         description: Restaurant already exists
 */
router.put(
  "/:id",
  authenticate,
  authorize("restaurants", "update"),
  validateRestaurantId,
  validateUpdateRestaurant,
  updateRestaurant
);

/**
 * @swagger
 * /api/v1/restaurants/{id}:
 *   delete:
 *     summary: Deactivate restaurant
 *     tags: [Restaurants]
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
 *         description: Restaurant deactivated successfully
 *       400:
 *         description: Invalid restaurant ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Restaurant not found
 *       409:
 *         description: Restaurant already inactive
 */
router.delete(
  "/:id",
  authenticate,
  authorize("restaurants", "delete"),
  validateRestaurantId,
  deleteRestaurantController
);

export default router;