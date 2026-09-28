import express from "express";

import {
  getStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation
} from "../controllers/station.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateStationList,
  validateStationId,
  validateCreateStation,
  validateUpdateStation
} from "../validators/station.validator.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Stations
 *   description: Railway station management APIs
 */

/**
 * @swagger
 * /api/v1/stations:
 *   get:
 *     summary: Get stations
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Stations retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  authenticate,
  authorize("stations", "read"),
  validateStationList,
  getStations
);

/**
 * @swagger
 * /api/v1/stations/{id}:
 *   get:
 *     summary: Get station by ID
 *     tags: [Stations]
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
 *         description: Station retrieved successfully
 *       400:
 *         description: Invalid station ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Station not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("stations", "read"),
  validateStationId,
  getStationById
);

/**
 * @swagger
 * /api/v1/stations:
 *   post:
 *     summary: Create station
 *     tags: [Stations]
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
 *               - code
 *               - city
 *               - state
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *             example:
 *               name: "Secunderabad Junction"
 *               code: "SC"
 *               city: "Hyderabad"
 *               state: "Telangana"
 *               latitude: 17.4344
 *               longitude: 78.5013
 *     responses:
 *       201:
 *         description: Station created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Station code already exists
 */
router.post(
  "/",
  authenticate,
  authorize("stations", "insert"),
  validateCreateStation,
  createStation
);

/**
 * @swagger
 * /api/v1/stations/{id}:
 *   put:
 *     summary: Update station
 *     tags: [Stations]
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
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Station updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Station not found
 *       409:
 *         description: Station code already exists
 */
router.put(
  "/:id",
  authenticate,
  authorize("stations", "update"),
  validateStationId,
  validateUpdateStation,
  updateStation
);

/**
 * @swagger
 * /api/v1/stations/{id}:
 *   delete:
 *     summary: Delete station
 *     tags: [Stations]
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
 *         description: Station deleted successfully
 *       400:
 *         description: Invalid station ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Station not found
 */
router.delete(
  "/:id",
  authenticate,
  authorize("stations", "delete"),
  validateStationId,
  deleteStation
);

export default router;