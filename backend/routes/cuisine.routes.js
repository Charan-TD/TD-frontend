import express from "express";

import {
  getAllCuisinesController
} from "../controllers/cuisine.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/cuisines:
 *   get:
 *     summary: Get all cuisines
 *     description: Returns all available cuisines with their cuisine ID and name.
 *     tags:
 *       - Menu Items
 *     responses:
 *       200:
 *         description: Cuisines retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cuisine_id:
 *                         type: string
 *                         example: C2803947234
 *                       name:
 *                         type: string
 *                         example: Indian
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  getAllCuisinesController
);

export default router;