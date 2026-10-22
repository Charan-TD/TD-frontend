import express from "express";

import {
  sendRestaurantOtpController,
  verifyRestaurantOtpController,
  loginRestaurantController,
  forgotRestaurantPasswordController,
  resetRestaurantPasswordController,
  changeRestaurantPasswordController
} from "../controllers/restaurantAuth.controller.js";
import { authenticateRestaurant } from "../middleware/restaurantAuthenticate.js";
import { restaurantPasswordLimiter } from "../middleware/rate-limit.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Restaurant Authentication
 *   description: Restaurant/Vendor authentication APIs
 */

/**
 * @swagger
 * /api/v1/auth/restaurant/send-otp:
 *   post:
 *     summary: Send restaurant login OTP
 *     tags: [Restaurant Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: '^\+?[1-9][0-9]{9,14}$'
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP generated successfully. OTP is included for non-production testing only.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     challengeId:
 *                       type: string
 *                       format: uuid
 *                     otp:
 *                       type: string
 *                       description: Six-digit testing OTP.
 *                       example: "483921"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       403:
 *         description: Restaurant account is not active
 *       404:
 *         description: Restaurant account not found
 *       503:
 *         description: OTP delivery is not configured in production
 */
router.post(
  "/send-otp",
  sendRestaurantOtpController
);

/**
 * @swagger
 * /api/v1/auth/restaurant/verify-otp:
 *   post:
 *     summary: Verify restaurant login OTP
 *     tags: [Restaurant Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 pattern: '^\+?[1-9][0-9]{9,14}$'
 *                 example: "+919876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Restaurant logged in successfully
 *       400:
 *         description: Invalid or expired OTP
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Restaurant account is not active
 *       404:
 *         description: Restaurant account not found
 */
router.post(
  "/verify-otp",
  verifyRestaurantOtpController
);

/**
 * @swagger
 * /api/v1/auth/restaurant/login:
 *   post:
 *     summary: Restaurant email and password login
 *     description: Authenticates a restaurant user using email and password and returns access and refresh JWT tokens.
 *     tags:
 *       - Restaurant Authentication
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
 *                 example: owner@restaurant.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 128
 *           example:
 *             email: owner@restaurant.com
 *             password: "StrongPassword123"
 *     responses:
 *       200:
 *         description: Restaurant logged in successfully
 *       400:
 *         description: Invalid email or password format
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Restaurant account is not active
 *       500:
 *         description: Internal server error
 */
router.post(
  "/login",
  loginRestaurantController
);

/**
 * @swagger
 * /api/v1/auth/restaurant/forgot-password:
 *   post:
 *     summary: Request a restaurant password reset
 *     description: Returns a generic response to avoid revealing whether an email is registered. In non-production environments, the reset token is returned for testing because email delivery is not configured.
 *     tags: [Restaurant Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset request processed
 *       400:
 *         description: Invalid email
 *       429:
 *         description: Too many password requests
 *       503:
 *         description: Password reset email delivery is not configured
 */
router.post(
  "/forgot-password",
  restaurantPasswordLimiter,
  forgotRestaurantPasswordController
);

/**
 * @swagger
 * /api/v1/auth/restaurant/reset-password:
 *   post:
 *     summary: Reset a restaurant password using a one-time token
 *     tags: [Restaurant Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 128
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid, expired, or used token
 *       429:
 *         description: Too many password requests
 */
router.post(
  "/reset-password",
  restaurantPasswordLimiter,
  resetRestaurantPasswordController
);

/**
 * @swagger
 * /api/v1/auth/restaurant/change-password:
 *   post:
 *     summary: Change the authenticated restaurant password
 *     tags: [Restaurant Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password:
 *                 type: string
 *                 format: password
 *               new_password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 128
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid password input
 *       401:
 *         description: Invalid access token or current password
 *       403:
 *         description: Restaurant account is not active
 *       429:
 *         description: Too many password requests
 */
router.post(
  "/change-password",
  authenticateRestaurant,
  restaurantPasswordLimiter,
  changeRestaurantPasswordController
);

export default router;