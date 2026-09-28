import express from "express";

import {
  getDeliveryPartnerUsers,
  getDeliveryPartnerUserById,
  createDeliveryPartnerUser,
  updateDeliveryPartnerUser,
  updateDeliveryPartnerStatus
} from "../controllers/delivery-partner-user.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateDeliveryPartnerList,
  validateDeliveryPartnerUserId,
  validateCreateDeliveryPartnerUser,
  validateUpdateDeliveryPartnerUser,
  validateDeliveryPartnerStatus
} from "../validators/delivery-partner-user.validator.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/delivery-partner-users:
 *   get:
 *     summary: Get delivery partners
 *     description: Retrieve delivery partners with pagination and optional status filtering.
 *     tags:
 *       - Delivery Partner Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of records per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - PENDING
 *             - ACTIVE
 *             - INACTIVE
 *             - REJECTED
 *         description: Filter by delivery partner status
 *     responses:
 *       200:
 *         description: Delivery partners retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.get(
  "/",
  authenticate,
  authorize("riders", "read"),
  validateDeliveryPartnerList,
  getDeliveryPartnerUsers
);

/**
 * @swagger
 * /api/v1/delivery-partner-users/{id}:
 *   get:
 *     summary: Get delivery partner by ID
 *     tags:
 *       - Delivery Partner Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery partner ID
 *     responses:
 *       200:
 *         description: Delivery partner retrieved successfully
 *       400:
 *         description: Invalid delivery partner ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Delivery partner not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("riders", "read"),
  validateDeliveryPartnerUserId,
  getDeliveryPartnerUserById
);

/**
 * @swagger
 * /api/v1/delivery-partner-users:
 *   post:
 *     summary: Create delivery partner
 *     tags:
 *       - Delivery Partner Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - license_number
 *               - bank_account_number
 *               - bank_ifsc
 *               - bank_account_holder
 *             properties:
 *               license_number:
 *                 type: string
 *                 example: TS123456789
 *               license_verified:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *               aadhaar_verified:
 *                 type: boolean
 *                 default: false
 *                 example: false
 *               bank_account_number:
 *                 type: string
 *                 example: "123456789012"
 *               bank_ifsc:
 *                 type: string
 *                 example: SBIN0001234
 *               bank_account_holder:
 *                 type: string
 *                 example: Ravi Kumar
 *               status:
 *                 type: string
 *                 enum:
 *                   - PENDING
 *                   - ACTIVE
 *                   - INACTIVE
 *                   - REJECTED
 *                 default: PENDING
 *               profile_image_url:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/profile.jpg
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: "9876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *                 example: ravi@example.com
 *               full_name:
 *                 type: string
 *                 nullable: true
 *                 example: Ravi Kumar
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "1995-05-15"
 *               gender:
 *                 type: string
 *                 nullable: true
 *                 example: Male
 *               vehicle_type:
 *                 type: string
 *                 nullable: true
 *                 example: Bike
 *               vehicle_number:
 *                 type: string
 *                 nullable: true
 *                 example: TS09AB1234
 *     responses:
 *       201:
 *         description: Delivery partner created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       409:
 *         description: Duplicate delivery partner data
 */
router.post(
  "/",
  authenticate,
  authorize("riders", "insert"),
  validateCreateDeliveryPartnerUser,
  createDeliveryPartnerUser
);

/**
 * @swagger
 * /api/v1/delivery-partner-users/{id}:
 *   put:
 *     summary: Update delivery partner
 *     tags:
 *       - Delivery Partner Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery partner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               license_number:
 *                 type: string
 *               license_verified:
 *                 type: boolean
 *               aadhaar_verified:
 *                 type: boolean
 *               bank_account_number:
 *                 type: string
 *               bank_ifsc:
 *                 type: string
 *               bank_account_holder:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum:
 *                   - PENDING
 *                   - ACTIVE
 *                   - INACTIVE
 *                   - REJECTED
 *               profile_image_url:
 *                 type: string
 *                 nullable: true
 *               phone:
 *                 type: string
 *                 nullable: true
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               full_name:
 *                 type: string
 *                 nullable: true
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               gender:
 *                 type: string
 *                 nullable: true
 *               vehicle_type:
 *                 type: string
 *                 nullable: true
 *               vehicle_number:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Delivery partner updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Delivery partner not found
 *       409:
 *         description: Duplicate delivery partner data
 */
router.put(
  "/:id",
  authenticate,
  authorize("riders", "update"),
  validateDeliveryPartnerUserId,
  validateUpdateDeliveryPartnerUser,
  updateDeliveryPartnerUser
);

/**
 * @swagger
 * /api/v1/delivery-partner-users/{id}/status:
 *   patch:
 *     summary: Update delivery partner status
 *     tags:
 *       - Delivery Partner Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Delivery partner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - PENDING
 *                   - ACTIVE
 *                   - INACTIVE
 *                   - REJECTED
 *                 example: ACTIVE
 *     responses:
 *       200:
 *         description: Delivery partner status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Delivery partner not found
 *       409:
 *         description: Delivery partner already has this status
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("riders", "update"),
  validateDeliveryPartnerUserId,
  validateDeliveryPartnerStatus,
  updateDeliveryPartnerStatus
);

export default router;