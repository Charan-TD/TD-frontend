import {
  listCustomerUsers,
  getCustomerUser,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from "../services/customer-user.service.js";

// GET /api/v1/customer-users
export const getCustomerUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status
    } = req.query;

    const result = await listCustomerUsers({
      page: Number(page),
      limit: Number(limit),
      status
    });

    return res.status(200).json({
      success: true,
      message: "Customer users retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/customer-users/:id
export const getCustomerUserById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const customer = await getCustomerUser(id);

    return res.status(200).json({
      success: true,
      message: "Customer user retrieved successfully",
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/customer-users
export const createCustomerUser = async (
  req,
  res,
  next
) => {
  try {
    const customer = await createCustomer(
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Customer user created successfully",
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/customer-users/:id
export const updateCustomerUser = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const customer = await updateCustomer(
      id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Customer user updated successfully",
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/v1/customer-users/:id
export const deleteCustomerUser = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const customer = await deleteCustomer(id);

    return res.status(200).json({
      success: true,
      message: "Customer user deactivated successfully",
      data: customer
    });
  } catch (error) {
    next(error);
  }
};