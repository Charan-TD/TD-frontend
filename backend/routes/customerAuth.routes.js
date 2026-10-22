import express from "express";

import {
  sendCustomerOtpController,
  getCustomerTestOtpController,
  verifyCustomerOtpController
} from "../controllers/customerAuth.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Customer Authentication
 *   description: Customer phone OTP authentication
 */

/**
 * @swagger
 * /api/v1/auth/customer/send-otp:
 *   post:
 *     summary: Send customer OTP
 *     tags:
 *       - Customer Authentication
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
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP generated successfully
 *       400:
 *         description: Invalid phone number
 */
router.post(
  "/send-otp",
  sendCustomerOtpController
);

/**
 * @swagger
 * /api/v1/auth/customer/test-otp:
 *   get:
 *     summary: Get the latest generated OTP (testing only, disabled in production)
 *     tags:
 *       - Customer Authentication
 *     responses:
 *       200:
 *         description: Latest OTP retrieved successfully
 *       404:
 *         description: No OTP generated yet, or running in production
 */
router.get(
  "/test-otp",
  getCustomerTestOtpController
);

/**
 * @swagger
 * /api/v1/auth/customer/verify-otp:
 *   post:
 *     summary: Verify customer OTP and login/register
 *     tags:
 *       - Customer Authentication
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
 *                 example: "+919876543210"
 *               otp:
 *                 type: string
 *                 example: "483921"
 *     responses:
 *       200:
 *         description: Customer authenticated successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  "/verify-otp",
  verifyCustomerOtpController
);

export default router;