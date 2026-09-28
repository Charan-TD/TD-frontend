import {
  getCustomerUsers,
  findCustomerUserById,
  findCustomerUserByPhone,
  findCustomerUserByEmail,
  createCustomerUser,
  updateCustomerUser,
  deactivateCustomerUser
} from "../repositories/customer-user.repository.js";

import { AppError } from "../utils/app-error.js";

// List customers
export const listCustomerUsers = async ({
  page = 1,
  limit = 20,
  status
}) => {
  const result = await getCustomerUsers({
    page,
    limit,
    status
  });

  return {
    customers: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: result.total,
      totalPages: Math.ceil(result.total / Number(limit))
    }
  };
};

// Get customer by ID
export const getCustomerUser = async (id) => {
  const customer = await findCustomerUserById(id);

  if (!customer) {
    throw new AppError(
      "Customer user not found",
      404
    );
  }

  return customer;
};

// Create customer
export const createCustomer = async (data) => {
  const {
    phone,
    email,
    full_name
  } = data;

  // Check duplicate phone
  if (phone) {
    const existingPhone =
      await findCustomerUserByPhone(phone);

    if (existingPhone) {
      throw new AppError(
        "Customer with this phone already exists",
        409
      );
    }
  }

  // Check duplicate email
  if (email) {
    const existingEmail =
      await findCustomerUserByEmail(email);

    if (existingEmail) {
      throw new AppError(
        "Customer with this email already exists",
        409
      );
    }
  }

  if (!phone && !email) {
    throw new AppError(
      "Phone or email is required",
      400
    );
  }

  if (full_name && full_name.trim().length === 0) {
    throw new AppError(
      "Full name cannot be empty",
      400
    );
  }

  return await createCustomerUser(data);
};

// Update customer
export const updateCustomer = async (
  id,
  data
) => {
  const existingCustomer =
    await findCustomerUserById(id);

  if (!existingCustomer) {
    throw new AppError(
      "Customer user not found",
      404
    );
  }

  // Check duplicate phone
  if (
    data.phone &&
    data.phone !== existingCustomer.phone
  ) {
    const existingPhone =
      await findCustomerUserByPhone(data.phone);

    if (
      existingPhone &&
      existingPhone.id !== id
    ) {
      throw new AppError(
        "Customer with this phone already exists",
        409
      );
    }
  }

  // Check duplicate email
  if (
    data.email &&
    data.email !== existingCustomer.email
  ) {
    const existingEmail =
      await findCustomerUserByEmail(data.email);

    if (
      existingEmail &&
      existingEmail.id !== id
    ) {
      throw new AppError(
        "Customer with this email already exists",
        409
      );
    }
  }

  if (
    data.full_name !== undefined &&
    data.full_name !== null &&
    data.full_name.trim().length === 0
  ) {
    throw new AppError(
      "Full name cannot be empty",
      400
    );
  }

  return await updateCustomerUser(
    id,
    data
  );
};

// Deactivate customer
export const deleteCustomer = async (id) => {
  const existingCustomer =
    await findCustomerUserById(id);

  if (!existingCustomer) {
    throw new AppError(
      "Customer user not found",
      404
    );
  }

  if (existingCustomer.status === "INACTIVE") {
    throw new AppError(
      "Customer user is already inactive",
      409
    );
  }

  return await deactivateCustomerUser(id);
};