import express from "express";

import {
  employeeLogin,
  getCurrentEmployee,
  refreshEmployeeToken,
  forgotEmployeePassword,
  resetEmployeePasswordController
} from "../controllers/auth.controller.js";

import {
  validateChangePassword
} from "../validators/auth.validator.js";

import {
  changePassword
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/authenticate.js";

import {
  employeeLoginLimiter,
  employeeRefreshLimiter
} from "../middleware/rate-limit.js";

import {
  validateEmployeeLogin,
  validateEmployeeRefresh,
  validateForgotEmployeePassword,
  validateResetEmployeePassword
} from "../validators/auth.validator.js";
const router = express.Router();
/**
 * @swagger
 * /api/v1/auth/employee/login:
 *   post:
 *     summary: Employee login
 *     tags:
 *       - Employee Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: employee@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: your-password
 *     responses:
 *       200:
 *         description: Employee login successful
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Invalid email or password
 *       429:
 *         description: Too many login attempts
 */


router.post(
  "/employee/login",
  employeeLoginLimiter,
  validateEmployeeLogin,
  employeeLogin
);

/**
 * @swagger
 * /api/v1/auth/employee/me:
 *   get:
 *     summary: Get current authenticated employee
 *     tags:
 *       - Employee Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated employee
 *       401:
 *         description: Invalid or expired access token
 */

router.get(
  "/employee/me",
  authenticate,
  getCurrentEmployee
);



/**
 * @swagger
 * /api/v1/auth/employee/refresh:
 *   post:
 *     summary: Refresh employee access token
 *     tags:
 *       - Employee Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIs...
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *       400:
 *         description: Refresh token is required
 *       401:
 *         description: Invalid or expired refresh token
 *       429:
 *         description: Too many refresh requests
 */
router.post(
  "/employee/refresh",
  employeeRefreshLimiter,
  validateEmployeeRefresh,
  refreshEmployeeToken
);

/**
 * @swagger
 * /api/v1/auth/employee/forgot-password:
 *   post:
 *     summary: Request employee password reset
 *     tags: [Employee Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: employee@example.com
 *     responses:
 *       200:
 *         description: Password reset request processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid email
 */

router.post(
  "/employee/forgot-password",
  employeeLoginLimiter,
  validateForgotEmployeePassword,
  forgotEmployeePassword
);

/**
 * @swagger
 * /api/v1/auth/employee/reset-password:
 *   post:
 *     summary: Reset employee password
 *     tags: [Employee Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: 8f4a9c...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecurePassword123!
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid, expired, or already-used reset token
 *       403:
 *         description: Employee account is inactive
 *       404:
 *         description: Employee not found
 */

router.post(
  "/employee/reset-password",
  employeeLoginLimiter,
  validateResetEmployeePassword,
  resetEmployeePasswordController
);

/**
 * @swagger
 * /api/v1/auth/employee/change-password:
 *   post:
 *     summary: Change employee password
 *     description: Allows an authenticated employee to change their current password.
 *     tags:
 *       - Employee Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 format: password
 *                 minLength: 1
 *                 example: OldPassword123
 *               new_password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 128
 *                 example: NewPassword456
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Invalid password input
 *       401:
 *         description: Authentication failed or current password is incorrect
 *       403:
 *         description: Employee account is not active
 *       404:
 *         description: Employee not found
 */

router.post(
  "/employee/change-password",
  authenticate,
  validateChangePassword,
  changePassword
);

export default router;