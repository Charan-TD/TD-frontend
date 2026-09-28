import {
  listOrders,
  getOrder,
  listCustomerOrders,
  createNewOrder,
  updateExistingOrder,
  changeOrderStatus
} from "../services/order.service.js";

// GET /api/v1/orders
export const getOrders = async (
  req,
  res,
  next
) => {
  try {
    const {
      page = 1,
      limit = 20,
      status
    } = req.query;

    const result = await listOrders({
      page: Number(page),
      limit: Number(limit),
      status
    });

    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/orders/:id
export const getOrderById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const order = await getOrder(id);

    return res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/orders/customer/:customerUserId
export const getOrdersByCustomer = async (
  req,
  res,
  next
) => {
  try {
    const { customerUserId } = req.params;

    const {
      page = 1,
      limit = 20
    } = req.query;

    const result =
      await listCustomerOrders(
        customerUserId,
        {
          page: Number(page),
          limit: Number(limit)
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Customer orders retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/orders
export const createOrder = async (
  req,
  res,
  next
) => {
  try {
    const order =
      await createNewOrder(req.body);

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/orders/:id
export const updateOrder = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const order =
      await updateExistingOrder(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/orders/:id/status
export const updateOrderStatus = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order =
      await changeOrderStatus(
        id,
        status
      );

    return res.status(200).json({
      success: true,
      message:
        "Order status updated successfully",
      data: order
    });
  } catch (error) {
    next(error);
  }
};