import express from "express";

import {
  getMyProfile,
  updateMyProfile
} from "../controllers/customer-user.controller.js";
import { uploadCustomerProfileImage } from "../middleware/customerProfileUpload.js";
import { customerAuthenticate } from "../middleware/customerAuthenticate.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Customer Profile
 *   description: Customer self-service profile APIs
 */

/**
 * @swagger
 * /api/v1/customer/profile:
 *   get:
 *     summary: Get my customer profile
 *     tags: [Customer Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/profile",
  customerAuthenticate,
  getMyProfile
);

/**
 * @swagger
 * /api/v1/customer/profile:
 *   put:
 *     summary: Update my customer profile
 *     tags: [Customer Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               full_name:
 *                 type: string
 *               profile_img:
 *                 type: string
 *                 format: binary
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customer profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Email already exists
 */
router.put(
  "/profile",
  customerAuthenticate,
  uploadCustomerProfileImage,
  updateMyProfile
);

export default router;