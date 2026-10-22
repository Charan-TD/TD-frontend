import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import * as controller from "../controllers/adminRestaurantRegistration.controller.js";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/v1/admin/restaurant-registration-requests:
 *   get:
 *     summary: List restaurant registration requests for admin review
 *     tags: [admin_restaurant_registration_request]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           default: pending
 *         description: Filter by admin review status.
 *     responses:
 *       200:
 *         description: Registration requests retrieved successfully
 *       400:
 *         description: Invalid status filter
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  "/",
  authorize("restaurants", "read"),
  controller.listRequests
);

/**
 * @swagger
 * /api/v1/admin/restaurant-registration-requests/{requestId}:
 *   patch:
 *     summary: Accept or reject a restaurant registration request
 *     description: >
 *       Set decision to ACCEPTED to activate the restaurant registration.
 *       Set decision to REJECTED to reject it; rejection_reason is required
 *       only for that decision.
 *     tags: [admin_restaurant_registration_request]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Registration request UUID from the request list.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required: [decision]
 *                 properties:
 *                   decision:
 *                     type: string
 *                     enum: [ACCEPTED]
 *               - type: object
 *                 required: [decision, rejection_reason]
 *                 properties:
 *                   decision:
 *                     type: string
 *                     enum: [REJECTED]
 *                   rejection_reason:
 *                     type: string
 *                     minLength: 1
 *                     example: Submitted business documents are incomplete
 *     responses:
 *       200:
 *         description: Registration request reviewed successfully
 *       400:
 *         description: Invalid decision or missing rejection reason
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Registration request not found
 *       409:
 *         description: Registration request already reviewed
 */
router.patch(
  "/:requestId",
  authorize("restaurants", "update"),
  controller.decideRequest
);

export default router;
