import express from "express";

import {
  getEmployees,
  createEmployeeController,
  updateEmployeeController,
  deleteEmployeeController
} from "../controllers/employee.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateCreateEmployee,
  validateUpdateEmployee
} from "../validators/employee.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management APIs
 */

/**
 * @swagger
 * /api/v1/employees:
 *   get:
 *     summary: Get employees
 *     description: Returns a paginated list of employees. Requires employees.read permission.
 *     tags: [Employees]
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
 *         description: Number of employees per page
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Employee does not have employees.read permission
 */
router.get(
  "/",
  authenticate,
  authorize("employees", "read"),
  getEmployees
);

/**
 * @swagger
 * /api/v1/employees:
 *   post:
 *     summary: Create employee
 *     description: Creates an employee and assigns an existing role. Requires employees.insert permission.
 *     tags: [Employees]
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
 *               - email
 *               - empId
 *               - password
 *               - roleId
 *             properties:
 *               name:
 *                 type: string
 *                 example: New Employee
 *               email:
 *                 type: string
 *                 format: email
 *                 example: employee@example.com
 *               empId:
 *                 type: string
 *                 example: EMP-1011
 *               password:
 *                 type: string
 *                 format: password
 *                 example: AdminCreatedPassword123
 *               status:
 *                 type: string
 *                 enum:
 *                   - active
 *                   - inactive
 *                 example: active
 *               profileImgUrl:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/profile.jpg
 *               roleId:
 *                 type: string
 *                 format: uuid
 *                 example: 22c7c9d9-9300-471d-b7f0-d44d24df1170
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Invalid request or role not found
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Employee does not have employees.insert permission
 *       409:
 *         description: Employee email or employee ID already exists
 */
router.post(
  "/",
  authenticate,
  authorize("employees", "insert"),
  validateCreateEmployee,
  createEmployeeController
);

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   patch:
 *     summary: Update employee
 *     description: Updates one or more employee fields. Requires employees.update permission.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Employee
 *               email:
 *                 type: string
 *                 format: email
 *                 example: updated@example.com
 *               empId:
 *                 type: string
 *                 example: EMP-1011
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewAdminPassword123
 *               status:
 *                 type: string
 *                 enum:
 *                   - active
 *                   - inactive
 *                 example: active
 *               profileImgUrl:
 *                 type: string
 *                 nullable: true
 *                 example: https://example.com/profile.jpg
 *               roleId:
 *                 type: string
 *                 format: uuid
 *                 example: 22c7c9d9-9300-471d-b7f0-d44d24df1170
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Employee does not have employees.update permission
 *       404:
 *         description: Employee not found
 *       409:
 *         description: Email or employee ID already exists
 */
router.patch(
  "/:id",
  authenticate,
  authorize("employees", "update"),
  validateUpdateEmployee,
  updateEmployeeController
);

/**
 * @swagger
 * /api/v1/employees/{id}:
 *   delete:
 *     summary: Deactivate employee
 *     description: Deactivates an employee and their active role assignment. This is a soft delete. Requires employees.delete permission.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee UUID
 *     responses:
 *       200:
 *         description: Employee deactivated successfully
 *       401:
 *         description: Authentication required or invalid access token
 *       403:
 *         description: Employee does not have employees.delete permission
 *       404:
 *         description: Employee not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("employees", "delete"),
  deleteEmployeeController
);

export default router;