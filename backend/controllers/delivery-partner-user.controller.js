import {
  listDeliveryPartnerUsers,
  getDeliveryPartnerUser,
  createDeliveryPartner,
  updateDeliveryPartner,
  changeDeliveryPartnerStatus
} from "../services/delivery-partner-user.service.js";

// GET /api/v1/delivery-partner-users
export const getDeliveryPartnerUsers = async (
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

    const result =
      await listDeliveryPartnerUsers({
        page: Number(page),
        limit: Number(limit),
        status
      });

    return res.status(200).json({
      success: true,
      message:
        "Delivery partners retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/delivery-partner-users/:id
export const getDeliveryPartnerUserById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const deliveryPartner =
      await getDeliveryPartnerUser(id);

    return res.status(200).json({
      success: true,
      message:
        "Delivery partner retrieved successfully",
      data: deliveryPartner
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/delivery-partner-users
export const createDeliveryPartnerUser = async (
  req,
  res,
  next
) => {
  try {
    const deliveryPartner =
      await createDeliveryPartner(req.body);

    return res.status(201).json({
      success: true,
      message:
        "Delivery partner created successfully",
      data: deliveryPartner
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/delivery-partner-users/:id
export const updateDeliveryPartnerUser = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    const deliveryPartner =
      await updateDeliveryPartner(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Delivery partner updated successfully",
      data: deliveryPartner
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/v1/delivery-partner-users/:id/status
export const updateDeliveryPartnerStatus = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const deliveryPartner =
      await changeDeliveryPartnerStatus(
        id,
        status
      );

    return res.status(200).json({
      success: true,
      message:
        "Delivery partner status updated successfully",
      data: deliveryPartner
    });
  } catch (error) {
    next(error);
  }
};