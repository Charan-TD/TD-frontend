import {
  getDeliveryPartnerUsers,
  findDeliveryPartnerUserById,
  findDeliveryPartnerByLicense,
  findDeliveryPartnerByPhone,
  findDeliveryPartnerByEmail,
  createDeliveryPartnerUser,
  updateDeliveryPartnerUser,
  updateDeliveryPartnerStatus
} from "../repositories/delivery-partner-user.repository.js";

import { AppError } from "../utils/app-error.js";

const ALLOWED_STATUSES = [
  "PENDING",
  "ACTIVE",
  "INACTIVE",
  "REJECTED"
];

// List delivery partners
export const listDeliveryPartnerUsers = async ({
  page = 1,
  limit = 20,
  status
}) => {
  const result = await getDeliveryPartnerUsers({
    page,
    limit,
    status
  });

  return {
    deliveryPartners: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: result.total,
      totalPages: Math.ceil(
        result.total / Number(limit)
      )
    }
  };
};

// Get delivery partner by ID
export const getDeliveryPartnerUser = async (id) => {
  const deliveryPartner =
    await findDeliveryPartnerUserById(id);

  if (!deliveryPartner) {
    throw new AppError(
      "Delivery partner not found",
      404
    );
  }

  return deliveryPartner;
};

// Create delivery partner
export const createDeliveryPartner = async (
  data
) => {
  const {
    license_number,
    bank_account_number,
    bank_ifsc,
    bank_account_holder,
    phone,
    email,
    status
  } = data;

  if (
    !license_number ||
    license_number.trim().length === 0
  ) {
    throw new AppError(
      "License number is required",
      400
    );
  }

  if (
    !bank_account_number ||
    bank_account_number.trim().length === 0
  ) {
    throw new AppError(
      "Bank account number is required",
      400
    );
  }

  if (
    !bank_ifsc ||
    bank_ifsc.trim().length === 0
  ) {
    throw new AppError(
      "Bank IFSC is required",
      400
    );
  }

  if (
    !bank_account_holder ||
    bank_account_holder.trim().length === 0
  ) {
    throw new AppError(
      "Bank account holder is required",
      400
    );
  }

  // Check duplicate license
  const existingLicense =
    await findDeliveryPartnerByLicense(
      license_number
    );

  if (existingLicense) {
    throw new AppError(
      "Delivery partner with this license already exists",
      409
    );
  }

  // Check duplicate phone
  if (phone) {
    const existingPhone =
      await findDeliveryPartnerByPhone(phone);

    if (existingPhone) {
      throw new AppError(
        "Delivery partner with this phone already exists",
        409
      );
    }
  }

  // Check duplicate email
  if (email) {
    const existingEmail =
      await findDeliveryPartnerByEmail(email);

    if (existingEmail) {
      throw new AppError(
        "Delivery partner with this email already exists",
        409
      );
    }
  }

  if (
    status &&
    !ALLOWED_STATUSES.includes(
      status.toUpperCase()
    )
  ) {
    throw new AppError(
      "Invalid delivery partner status",
      400
    );
  }

  return await createDeliveryPartnerUser(data);
};

// Update delivery partner
export const updateDeliveryPartner = async (
  id,
  data
) => {
  const existingPartner =
    await findDeliveryPartnerUserById(id);

  if (!existingPartner) {
    throw new AppError(
      "Delivery partner not found",
      404
    );
  }

  // License duplicate check
  if (
    data.license_number &&
    data.license_number !==
      existingPartner.license_number
  ) {
    const existingLicense =
      await findDeliveryPartnerByLicense(
        data.license_number
      );

    if (
      existingLicense &&
      existingLicense.id !== id
    ) {
      throw new AppError(
        "Delivery partner with this license already exists",
        409
      );
    }
  }

  // Phone duplicate check
  if (
    data.phone &&
    data.phone !== existingPartner.phone
  ) {
    const existingPhone =
      await findDeliveryPartnerByPhone(
        data.phone
      );

    if (
      existingPhone &&
      existingPhone.id !== id
    ) {
      throw new AppError(
        "Delivery partner with this phone already exists",
        409
      );
    }
  }

  // Email duplicate check
  if (
    data.email &&
    data.email !== existingPartner.email
  ) {
    const existingEmail =
      await findDeliveryPartnerByEmail(
        data.email
      );

    if (
      existingEmail &&
      existingEmail.id !== id
    ) {
      throw new AppError(
        "Delivery partner with this email already exists",
        409
      );
    }
  }

  if (
    data.status &&
    !ALLOWED_STATUSES.includes(
      data.status.toUpperCase()
    )
  ) {
    throw new AppError(
      "Invalid delivery partner status",
      400
    );
  }

  return await updateDeliveryPartnerUser(
    id,
    data
  );
};

// Update delivery partner status
export const changeDeliveryPartnerStatus = async (
  id,
  status
) => {
  const existingPartner =
    await findDeliveryPartnerUserById(id);

  if (!existingPartner) {
    throw new AppError(
      "Delivery partner not found",
      404
    );
  }

  if (
    !ALLOWED_STATUSES.includes(
      status.toUpperCase()
    )
  ) {
    throw new AppError(
      "Invalid delivery partner status",
      400
    );
  }

  if (
    existingPartner.status ===
    status.toUpperCase()
  ) {
    throw new AppError(
      `Delivery partner is already ${status.toUpperCase()}`,
      409
    );
  }

  return await updateDeliveryPartnerStatus(
    id,
    status.toUpperCase()
  );
};