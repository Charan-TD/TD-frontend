
import express from "express";

import {
  employeeLogin,
  getCurrentEmployee,
  refreshEmployeeToken,
  forgotEmployeePassword,
  resetEmployeePasswordController,
  changePassword
} from "../controllers/auth.controller.js";

import {
  validateEmployeeLogin,
  validateEmployeeRefresh,
  validateForgotEmployeePassword,
  validateResetEmployeePassword,
  validateChangePassword
} from "../validators/auth.validator.js";

import { authenticate } from "../middleware/authenticate.js";

import {
  employeeLoginLimiter,
  employeeRefreshLimiter
} from "../middleware/rate-limit.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/employee/login:
 *   post:
 *     summary: Employee login
 *     tags: [Employee Authentication]
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
 *     tags: [Employee Authentication]
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
 *     tags: [Employee Authentication]
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
 *     description: >
 *       Generates a random single-use password reset token with
 *       a 15-minute expiry. For local development, the token
 *       is returned in the response for testing. In production,
 *       the token must be delivered through a verified email
 *       channel and must not be returned in the API response.
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: If an account exists with this email, password reset instructions have been generated.
 *                 data:
 *                   type: object
 *                   description: Only included for an existing active employee in non-production environments.
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       description: Random token used to reset the password.
 *                       example: 9b0d2c7a4e6f8103b5c9d1a2e4f60718293a4b5c6d7e8f90123456789abcdef0
 *                     expiresIn:
 *                       type: integer
 *                       description: Token validity in seconds.
 *                       example: 900
 *       400:
 *         description: Invalid email
 *       429:
 *         description: Too many requests
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
 *     summary: Reset employee password using token
 *     description: >
 *       Validates the employee email and password reset token.
 *       The token expires after 15 minutes and becomes invalid
 *       after a successful password reset. The new password
 *       must be 8 to 128 characters long and different from
 *       the current password.
 *     tags: [Employee Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: employee@example.com
 *               token:
 *                 type: string
 *                 description: Reset token returned by the forgot-password API during local testing.
 *                 example: paste-your-generated-reset-token-here
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 128
 *                 example: NewSecurePassword123!
 *     responses:
 *       200:
 *         description: Password reset successfully
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
 *                   example: Employee password reset successfully
 *       400:
 *         description: Invalid input, weak password, or invalid/expired/used token
 *       429:
 *         description: Too many requests
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
 *     tags: [Employee Authentication]
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
