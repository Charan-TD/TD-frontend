import express from "express";

import {
  getPermissions,
  createPermissionController,
  updatePermissionController,
  deletePermissionController
} from "../controllers/permission.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Permission management
 */

/**
 * @swagger
 * /api/v1/permissions:
 *   get:
 *     summary: Get permissions
 *     tags: [Permissions]
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
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.get(
  "/",
  authenticate,
  authorize("permissions", "read"),
  getPermissions
);

/**
 * @swagger
 * /api/v1/permissions:
 *   post:
 *     summary: Create permission
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissionName
 *             properties:
 *               permissionName:
 *                 type: string
 *                 example: employees_read
 *     responses:
 *       201:
 *         description: Permission created successfully
 *       400:
 *         description: Invalid request
 *       409:
 *         description: Permission already exists
 */
router.post(
  "/",
  authenticate,
  authorize("permissions", "insert"),
  createPermissionController
);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   patch:
 *     summary: Update permission
 *     tags: [Permissions]
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
 *             required:
 *               - permissionName
 *             properties:
 *               permissionName:
 *                 type: string
 *                 example: employees_update
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Permission not found
 *       409:
 *         description: Permission already exists
 */
router.patch(
  "/:id",
  authenticate,
  authorize("permissions", "update"),
  updatePermissionController
);

/**
 * @swagger
 * /api/v1/permissions/{id}:
 *   delete:
 *     summary: Delete permission
 *     tags: [Permissions]
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
 *         description: Permission deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Permission not found
 *       409:
 *         description: Permission is assigned to a role
 */
router.delete(
  "/:id",
  authenticate,
  authorize("permissions", "delete"),
  deletePermissionController
);

export default router;