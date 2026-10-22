
import express from "express";

import {
  getStationDropdownController,
  getNearbyRestaurantsController
} from "../controllers/nearby-restaurant.controller.js";
import { customerAuthenticate } from "../middleware/customerAuthenticate.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/stations/dropdown:
 *   get:
 *     summary: Get stations for dropdown
 *     tags: [Stations]
 *     responses:
 *       200:
 *         description: Stations retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       station_id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       city:
 *                         type: string
 *                       state:
 *                         type: string
 */
router.get(
  "/stations/dropdown",
  getStationDropdownController
);


/**
 * @swagger
 * /api/v1/restaurants/near-station:
 *   get:
 *     summary: Get nearby restaurants and their menu items
 *     description: |
 *       Select a station from the dropdown.
 *       Returns restaurants connected to the selected station
 *       within a 2 km radius, along with their menu items.
 *       Requires a logged-in customer access token.
 *     tags:
 *       - Restaurants
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: station_name
 *         in: query
 *         required: true
 *         description: Select a station
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nearby restaurants retrieved successfully
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
 *                   example: Nearby restaurants retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     restaurants:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           restaurant_id:
 *                             type: string
 *                             format: uuid
 *                           restaurant_name:
 *                             type: string
 *                           online_status:
 *                             type: string
 *                             enum: [OPEN, CLOSED]
 *                             description: Calculated from operating_hours using the current time in Asia/Kolkata.
 *                           rating:
 *                             type: number
 *                             example: 4.5
 *                             description: Placeholder rating value; not yet backed by customer reviews.
 *                           operating_hours:
 *                             type: object
 *                             nullable: true
 *                           menu_items:
 *                             type: array
 *                             items:
 *                               type: object
 *       400:
 *         description: Station name is required
 *       401:
 *         description: A valid customer access token is required
 *       404:
 *         description: Station not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/restaurants/near-station",
  customerAuthenticate,
  getNearbyRestaurantsController
);

export default router;
