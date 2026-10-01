import express from "express";

import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from "../controllers/role.controller.js";

import {authenticate} from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateCreateRole,
  validateUpdateRole,
  validateRoleId
} from "../validators/role.validator.js";

const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role management APIs
 */


/**
 * @swagger
 * /api/v1/roles:
 *   get:
 *     summary: Get all roles
 *     description: Retrieve all roles with their resource-level permissions and allowed actions.
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.get(
  "/",
  authenticate,
  authorize("roles", "read"),
  getRoles
);


/**
 * @swagger
 * /api/v1/roles/{roleId}:
 *   get:
 *     summary: Get role by ID
 *     description: Retrieve a specific role with its resource-level permissions and allowed actions.
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         description: Role UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *       400:
 *         description: Invalid role ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Role not found
 */
router.get(
  "/:roleId",
  authenticate,
  authorize("roles", "read"),
  validateRoleId,
  getRoleById
);


/**
 * @swagger
 * /api/v1/roles:
 *   post:
 *     summary: Create a role
 *     description: Create a role with resource-level permissions and actions.
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleName
 *               - permissions
 *             properties:
 *               roleName:
 *                 type: string
 *                 example: Manager
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Operations manager
 *               permissions:
 *                 type: array
 *                 description: Resource permissions assigned to the role.
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - permissionId
 *                     - actions
 *                   properties:
 *                     permissionId:
 *                       type: string
 *                       format: uuid
 *                       description: ID of the resource in the permissions table.
 *                     actions:
 *                       type: array
 *                       minItems: 1
 *                       items:
 *                         type: string
 *                         enum:
 *                           - read
 *                           - insert
 *                           - update
 *                           - delete
 *                       example:
 *                         - read
 *                         - update
 *                 example:
 *                   - permissionId: e9bd3387-91bb-4962-b951-1af54ea13fc6
 *                     actions:
 *                       - read
 *                   - permissionId: 3fc09e6a-b202-473f-b43d-c4a9f6408064
 *                     actions:
 *                       - read
 *                       - update
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Invalid role data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       409:
 *         description: Role name already exists
 */
router.post(
  "/",
  authenticate,
  authorize("roles", "insert"),
  validateCreateRole,
  createRole
);


/**
 * @swagger
 * /api/v1/roles/{roleId}:
 *   put:
 *     summary: Update a role
 *     description: Update role details and optionally replace its complete permission set.
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         description: Role UUID
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
 *               roleName:
 *                 type: string
 *                 example: Senior Manager
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Updated operations manager
 *               permissions:
 *                 type: array
 *                 minItems: 1
 *                 description: Complete replacement permission set when provided.
 *                 items:
 *                   type: object
 *                   required:
 *                     - permissionId
 *                     - actions
 *                   properties:
 *                     permissionId:
 *                       type: string
 *                       format: uuid
 *                     actions:
 *                       type: array
 *                       minItems: 1
 *                       items:
 *                         type: string
 *                         enum:
 *                           - read
 *                           - insert
 *                           - update
 *                           - delete
 *                 example:
 *                   - permissionId: e9bd3387-91bb-4962-b951-1af54ea13fc6
 *                     actions:
 *                       - read
 *                       - update
 *                   - permissionId: 3fc09e6a-b202-473f-b43d-c4a9f6408064
 *                     actions:
 *                       - read
 *                       - update
 *                       - delete
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Invalid role data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Role not found
 *       409:
 *         description: Role name already exists
 */
router.put(
  "/:roleId",
  authenticate,
  authorize("roles", "update"),
  validateRoleId,
  validateUpdateRole,
  updateRole
);


/**
 * @swagger
 * /api/v1/roles/{roleId}:
 *   delete:
 *     summary: Delete a role
 *     description: Delete a role and its resource-level permission mappings.
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         description: Role UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       400:
 *         description: Invalid role ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Role not found
 */
router.delete(
  "/:roleId",
  authenticate,
  authorize("roles", "delete"),
  validateRoleId,
  deleteRole
);


export default router;