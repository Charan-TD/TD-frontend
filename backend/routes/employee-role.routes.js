import express from "express";

import {
  getEmployeeRoles,
  createEmployeeRoleController,
  updateEmployeeRoleController,
  deleteEmployeeRoleController
} from "../controllers/employee-role.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateCreateEmployeeRole,
  validateUpdateEmployeeRole,
  validateEmployeeRoleId
} from "../validators/employee-role.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Employee Roles
 *   description: Employee and role assignment management
 */

/**
 * @swagger
 * /api/v1/employee-roles:
 *   get:
 *     summary: Get employee role assignments
 *     tags: [Employee Roles]
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
 *         description: Employee roles retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.get(
  "/",
  authenticate,
  authorize("employee_roles", "read"),
  getEmployeeRoles
);

/**
 * @swagger
 * /api/v1/employee-roles:
 *   post:
 *     summary: Assign a role to an employee
 *     tags: [Employee Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - roleId
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               roleId:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *     responses:
 *       201:
 *         description: Employee role assigned successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Employee or role not found
 *       409:
 *         description: Employee already has this role
 */
router.post(
  "/",
  authenticate,
  authorize("employee_roles", "insert"),
  validateCreateEmployeeRole,
  createEmployeeRoleController
);

/**
 * @swagger
 * /api/v1/employee-roles/{id}:
 *   patch:
 *     summary: Update an employee role assignment
 *     tags: [Employee Roles]
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
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               roleId:
 *                 type: string
 *                 format: uuid
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Employee role updated successfully
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Employee role, employee, or role not found
 *       409:
 *         description: Employee already has this role
 */
router.patch(
  "/:id",
  authenticate,
  authorize("employee_roles", "update"),
  validateEmployeeRoleId,
  validateUpdateEmployeeRole,
  updateEmployeeRoleController
);

/**
 * @swagger
 * /api/v1/employee-roles/{id}:
 *   delete:
 *     summary: Deactivate an employee role assignment
 *     tags: [Employee Roles]
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
 *         description: Employee role deactivated successfully
 *       400:
 *         description: Invalid employee role ID or already inactive
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Employee role assignment not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("employee_roles", "delete"),
  validateEmployeeRoleId,
  deleteEmployeeRoleController
);

export default router;