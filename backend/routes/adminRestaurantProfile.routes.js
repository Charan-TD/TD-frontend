
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import * as controller from "../controllers/restaurantProfile.controller.js";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Admin Restaurant Profile Requests
 *     description: Admin approval and rejection of profile changes
 */

/**
 * @swagger
 * /api/v1/admin/restaurant-profile-requests:
 *   get:
 *     summary: Get all restaurant profile change requests
 *     tags: [Admin Restaurant Profile Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Requests retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       restaurant_id:
 *                         type: string
 *                         format: uuid
 *                       status:
 *                         type: string
 *                         enum: [pending, approved, rejected]
 *                       requested_changes:
 *                         type: object
 *                       previous_values:
 *                         type: object
 *                       rejection_reason:
 *                         type: string
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  "/",
  authorize("restaurants", "read"),
  controller.listAdmin
);

/**
 * @swagger
 * /api/v1/admin/restaurant-profile-requests/{id}:
 *   get:
 *     summary: Get restaurant profile change request by ID
 *     tags: [Admin Restaurant Profile Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Profile change request UUID
 *     responses:
 *       200:
 *         description: Request retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     restaurant_id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected]
 *                     requested_changes:
 *                       type: object
 *                     previous_values:
 *                       type: object
 *                     rejection_reason:
 *                       type: string
 *                       nullable: true
 *                     reviewed_by:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     reviewed_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Request not found
 */
router.get(
  "/:id",
  authorize("restaurants", "read"),
  controller.getRequest
);

/**
 * @swagger
 * /api/v1/admin/restaurant-profile-requests/{id}/approve:
 *   patch:
 *     summary: Approve restaurant profile change request
 *     description: Applies requested changes to the restaurant profile.
 *     tags: [Admin Restaurant Profile Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Profile change request UUID
 *     responses:
 *       200:
 *         description: Request approved and profile updated
 *       400:
 *         description: Request cannot be approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Request not found
 *       409:
 *         description: Request already processed or data conflict
 */
router.patch(
  "/:id/approve",
  authorize("restaurants", "update"),
  controller.approve
);

/**
 * @swagger
 * /api/v1/admin/restaurant-profile-requests/{id}/reject:
 *   patch:
 *     summary: Reject restaurant profile change request
 *     tags: [Admin Restaurant Profile Requests]
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
 *               - rejection_reason
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 example: "PAN document does not match owner details"
 *     responses:
 *       200:
 *         description: Request rejected successfully
 *       400:
 *         description: Invalid rejection reason
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Request not found
 *       409:
 *         description: Request already processed
 */
router.patch(
  "/:id/reject",
  authorize("restaurants", "update"),
  controller.reject
);

export default router;
