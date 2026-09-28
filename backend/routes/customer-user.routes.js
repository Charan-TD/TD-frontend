import express from "express";

import {
  getCustomerUsers,
  getCustomerUserById,
  createCustomerUser,
  updateCustomerUser,
  deleteCustomerUser
} from "../controllers/customer-user.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateCustomerUserList,
  validateCustomerUserId,
  validateCreateCustomerUser,
  validateUpdateCustomerUser
} from "../validators/customer-user.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Customer Users
 *   description: Customer user management APIs
 */

/**
 * @swagger
 * /api/v1/customer-users:
 *   get:
 *     summary: Get customer users
 *     tags: [Customer Users]
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
 *         description: Customer users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authenticate,
  authorize("users", "read"),
  validateCustomerUserList,
  getCustomerUsers
);

/**
 * @swagger
 * /api/v1/customer-users/{id}:
 *   get:
 *     summary: Get customer user by ID
 *     tags: [Customer Users]
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
 *         description: Customer user retrieved successfully
 *       400:
 *         description: Invalid customer ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer user not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("users", "read"),
  validateCustomerUserId,
  getCustomerUserById
);

/**
 * @swagger
 * /api/v1/customer-users:
 *   post:
 *     summary: Create customer user
 *     tags: [Customer Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               full_name:
 *                 type: string
 *               profile_image_url:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *             example:
 *               phone: "+919876543210"
 *               email: "customer@example.com"
 *               full_name: "Rahul Kumar"
 *               date_of_birth: "1998-05-15"
 *               gender: "MALE"
 *               status: "ACTIVE"
 *     responses:
 *       201:
 *         description: Customer user created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Customer already exists
 */
router.post(
  "/",
  authenticate,
  authorize("users", "insert"),
  validateCreateCustomerUser,
  createCustomerUser
);

/**
 * @swagger
 * /api/v1/customer-users/{id}:
 *   put:
 *     summary: Update customer user
 *     tags: [Customer Users]
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
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               full_name:
 *                 type: string
 *               profile_image_url:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Customer user updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer user not found
 *       409:
 *         description: Customer already exists
 */
router.put(
  "/:id",
  authenticate,
  authorize("users", "update"),
  validateCustomerUserId,
  validateUpdateCustomerUser,
  updateCustomerUser
);

/**
 * @swagger
 * /api/v1/customer-users/{id}:
 *   delete:
 *     summary: Deactivate customer user
 *     tags: [Customer Users]
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
 *         description: Customer user deactivated successfully
 *       400:
 *         description: Invalid customer ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer user not found
 *       409:
 *         description: Customer user already inactive
 */
router.delete(
  "/:id",
  authenticate,
  authorize("users", "delete"),
  validateCustomerUserId,
  deleteCustomerUser
);

export default router;