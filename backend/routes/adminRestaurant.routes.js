import { Router } from "express";
import {
  approveRestaurantRegistration,
  rejectRestaurantRegistration
} from "../controllers/restaurant.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import {
  validateRestaurantId,
  validateRestaurantRejection
} from "../validators/restaurant.validator.js";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Admin Restaurant Registrations
 *     description: Admin approval and rejection of restaurant registrations
 */

/**
 * @swagger
 * /api/v1/admin/restaurants/{id}/approve:
 *   patch:
 *     summary: Approve a restaurant registration
 *     tags: [Admin Restaurant Registrations]
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
 *         description: Registration approved; admin status is ACTIVE and owner status is ACCEPTED
 *       400:
 *         description: Invalid restaurant ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Restaurant not found
 *       409:
 *         description: Registration was already processed
 */
router.patch(
  "/:id/approve",
  authorize("restaurants", "update"),
  validateRestaurantId,
  approveRestaurantRegistration
);

/**
 * @swagger
 * /api/v1/admin/restaurants/{id}/reject:
 *   patch:
 *     summary: Reject a restaurant registration
 *     tags: [Admin Restaurant Registrations]
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
 *             required: [rejection_reason]
 *             properties:
 *               rejection_reason:
 *                 type: string
 *                 minLength: 1
 *                 example: PAN document does not match owner details
 *     responses:
 *       200:
 *         description: Registration rejected
 *       400:
 *         description: Invalid restaurant ID or missing rejection reason
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Restaurant not found
 *       409:
 *         description: Registration was already processed
 */
router.patch(
  "/:id/reject",
  authorize("restaurants", "update"),
  validateRestaurantId,
  validateRestaurantRejection,
  rejectRestaurantRegistration
);

export default router;
