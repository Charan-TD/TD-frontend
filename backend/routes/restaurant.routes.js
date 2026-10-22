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
 *           enum: [ACTIVE, ACCEPTED, INACTIVE, PENDING, REJECTED]
 *     responses:
 *       200:
 *         description: Restaurants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     restaurants:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           owner_name:
 *                             type: string
 *                           owner_mobile:
 *                             type: string
 *                           restaurant_type:
 *                             type: string
 *                           restaurant_email:
 *                             type: string
 *                           restaurant_contact:
 *                             type: string
 *                           pan:
 *                             type: string
 *                             nullable: true
 *                           gstin:
 *                             type: string
 *                             nullable: true
 *                           fssai_number:
 *                             type: string
 *                             nullable: true
 *                           fssai_valid_until:
 *                             type: string
 *                             format: date
 *                             nullable: true
 *                           status:
 *                             type: string
 *                             enum: [ACTIVE, ACCEPTED, INACTIVE, PENDING, REJECTED]
 *                           online_status:
 *                             type: string
 *                             enum: [OPEN, CLOSED]
 *                             description: Calculated from operating_hours using the current time in Asia/Kolkata.
 *                           rating:
 *                             type: number
 *                             example: 4.5
 *                             description: Placeholder rating value; not yet backed by customer reviews.
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Restaurant registration details, bank information, and signed document URLs.
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     restaurant_type:
 *                       type: string
 *                     cuisines:
 *                       type: array
 *                       items:
 *                         type: string
 *                     food_served:
 *                       type: array
 *                       items:
 *                         type: string
 *                     latitude:
 *                       type: number
 *                       nullable: true
 *                     longitude:
 *                       type: number
 *                       nullable: true
 *                     city:
 *                       type: string
 *                       nullable: true
 *                     state:
 *                       type: string
 *                       nullable: true
 *                     pincode:
 *                       type: string
 *                       nullable: true
 *                     operating_hours:
 *                       type: object
 *                       nullable: true
 *                     online_status:
 *                       type: string
 *                       enum: [OPEN, CLOSED]
 *                       description: Calculated from operating_hours using the current time in Asia/Kolkata.
 *                     rating:
 *                       type: number
 *                       example: 4.5
 *                       description: Placeholder rating value; not yet backed by customer reviews.
 *                     account_holder_name:
 *                       type: string
 *                       nullable: true
 *                     account_number:
 *                       type: string
 *                       nullable: true
 *                     ifsc:
 *                       type: string
 *                       nullable: true
 *                     bank_name:
 *                       type: string
 *                       nullable: true
 *                     logo_url:
 *                       type: string
 *                       nullable: true
 *                     cover_url:
 *                       type: string
 *                       nullable: true
 *                     pan_document_url:
 *                       type: string
 *                       nullable: true
 *                     gst_document_url:
 *                       type: string
 *                       nullable: true
 *                     fssai_document_url:
 *                       type: string
 *                       nullable: true
 *                     business_proof_document_url:
 *                       type: string
 *                       nullable: true
 *                     aadhaar_document_url:
 *                       type: string
 *                       nullable: true
 *                     bank_proof_url:
 *                       type: string
 *                       nullable: true
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
 *               - restaurant_type
 *             properties:
 *               name:
 *                 type: string
 *               restaurant_type:
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
 *               account_number:
 *                 type: string
 *               ifsc:
 *                 type: string
 *               account_holder_name:
 *                 type: string
 *               bank_proof_id:
 *                 type: string
 *                 description: Storage path of the bank proof document
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, ACCEPTED, INACTIVE, PENDING, REJECTED]
 *             example:
 *               name: "Railway Spice Kitchen"
 *               restaurant_type: "restaurant"
 *               pan: "ABCDE1234F"
 *               gstin: "36ABCDE1234F1Z5"
 *               fssai_number: "12345678901234"
 *               fssai_valid_until: "2027-12-31"
 *               account_number: "1234567890"
 *               ifsc: "SBIN0001234"
 *               account_holder_name: "Railway Spice Kitchen Pvt Ltd"
 *               bank_proof_id: "registrations/{registrationId}/bank_proof/{fileName}.pdf"
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
 *     description: Restaurant type is set during registration and cannot be changed.
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
 *               pan:
 *                 type: string
 *               gstin:
 *                 type: string
 *               fssai_number:
 *                 type: string
 *               fssai_valid_until:
 *                 type: string
 *                 format: date
 *               account_number:
 *                 type: string
 *               ifsc:
 *                 type: string
 *               account_holder_name:
 *                 type: string
 *               bank_proof_id:
 *                 type: string
 *                 description: Storage path of the bank proof document
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, ACCEPTED, INACTIVE, PENDING, REJECTED]
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