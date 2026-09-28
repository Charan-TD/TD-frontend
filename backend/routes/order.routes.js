import express from "express";

import {
  getOrders,
  getOrderById,
  getOrdersByCustomer,
  createOrder,
  updateOrder,
  updateOrderStatus
} from "../controllers/order.controller.js";

import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

import {
  validateOrderList,
  validateOrderId,
  validateOrderCustomerId,
  validateCreateOrder,
  validateUpdateOrder,
  validateOrderStatus
} from "../validators/order.validator.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get orders
 *     description: Retrieve orders with pagination and optional status filtering.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of orders per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum:
 *             - PLACED
 *             - CONFIRMED
 *             - PREPARING
 *             - READY
 *             - OUT_FOR_DELIVERY
 *             - DELIVERED
 *             - CANCELLED
 *         description: Filter orders by status
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.get(
  "/",
  authenticate,
  authorize("orders", "read"),
  validateOrderList,
  getOrders
);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       400:
 *         description: Invalid order ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Order not found
 */
router.get(
  "/:id",
  authenticate,
  authorize("orders", "read"),
  validateOrderId,
  getOrderById
);

/**
 * @swagger
 * /api/v1/orders/customer/{customerUserId}:
 *   get:
 *     summary: Get orders by customer
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerUserId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Customer user ID
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
 *         description: Customer orders retrieved successfully
 *       400:
 *         description: Invalid customer user ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 */
router.get(
  "/customer/:customerUserId",
  authenticate,
  authorize("orders", "read"),
  validateOrderCustomerId,
  validateOrderList,
  getOrdersByCustomer
);

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create order
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer_user_id
 *               - train_id
 *               - journey_date
 *               - boarding_station_id
 *               - is_deliverable
 *               - subtotal
 *               - total
 *               - restaurant_station_service_id
 *             properties:
 *               customer_user_id:
 *                 type: string
 *                 format: uuid
 *               train_id:
 *                 type: string
 *                 format: uuid
 *               journey_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-01"
 *               boarding_station_id:
 *                 type: string
 *                 format: uuid
 *               coach:
 *                 type: string
 *                 example: "B2"
 *               seat:
 *                 type: string
 *                 example: "42"
 *               pnr:
 *                 type: string
 *                 example: "1234567890"
 *               queue_time_minutes:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               delivery_deadline:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               is_deliverable:
 *                 type: boolean
 *                 example: true
 *               status:
 *                 type: string
 *                 enum:
 *                   - PLACED
 *                   - CONFIRMED
 *                   - PREPARING
 *                   - READY
 *                   - OUT_FOR_DELIVERY
 *                   - DELIVERED
 *                   - CANCELLED
 *                 default: PLACED
 *               subtotal:
 *                 type: integer
 *                 minimum: 0
 *                 example: 500
 *               tax:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               packaging_fee:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               delivery_fee:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               total:
 *                 type: integer
 *                 minimum: 0
 *                 example: 550
 *               customer_note:
 *                 type: string
 *                 nullable: true
 *               discount:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               restaurant_station_service_id:
 *                 type: string
 *                 format: uuid
 *               idempotency_key:
 *                 type: string
 *                 nullable: true
 *               delivery_train_stop_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid order data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       409:
 *         description: Duplicate order request
 */
router.post(
  "/",
  authenticate,
  authorize("orders", "insert"),
  validateCreateOrder,
  createOrder
);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   put:
 *     summary: Update order
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               coach:
 *                 type: string
 *               seat:
 *                 type: string
 *               pnr:
 *                 type: string
 *               queue_time_minutes:
 *                 type: integer
 *                 minimum: 0
 *               delivery_deadline:
 *                 type: string
 *                 format: date-time
 *               is_deliverable:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum:
 *                   - PLACED
 *                   - CONFIRMED
 *                   - PREPARING
 *                   - READY
 *                   - OUT_FOR_DELIVERY
 *                   - DELIVERED
 *                   - CANCELLED
 *               subtotal:
 *                 type: integer
 *                 minimum: 0
 *               tax:
 *                 type: integer
 *                 minimum: 0
 *               packaging_fee:
 *                 type: integer
 *                 minimum: 0
 *               delivery_fee:
 *                 type: integer
 *                 minimum: 0
 *               total:
 *                 type: integer
 *                 minimum: 0
 *               customer_note:
 *                 type: string
 *               discount:
 *                 type: integer
 *                 minimum: 0
 *               restaurant_station_service_id:
 *                 type: string
 *                 format: uuid
 *               delivery_train_stop_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Invalid order data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Order not found
 */
router.put(
  "/:id",
  authenticate,
  authorize("orders", "update"),
  validateOrderId,
  validateUpdateOrder,
  updateOrder
);

/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - PLACED
 *                   - CONFIRMED
 *                   - PREPARING
 *                   - READY
 *                   - OUT_FOR_DELIVERY
 *                   - DELIVERED
 *                   - CANCELLED
 *                 example: CONFIRMED
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order already has this status
 */
router.patch(
  "/:id/status",
  authenticate,
  authorize("orders", "update"),
  validateOrderId,
  validateOrderStatus,
  updateOrderStatus
);

export default router;