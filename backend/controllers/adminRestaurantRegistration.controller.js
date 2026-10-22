import {
  decideAdminRegistrationRequest,
  listAdminRegistrationRequests
} from "../services/restaurantRegistration.service.js";

export const listRequests = async (req, res, next) => {
  try {
    const requests = await listAdminRegistrationRequests(
      req.query.status
    );

    return res.status(200).json({
      success: true,
      message: "Restaurant registration requests fetched successfully",
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

export const decideRequest = async (req, res, next) => {
  try {
    const { decision, rejection_reason: rejectionReason } =
      req.body || {};

    const result = await decideAdminRegistrationRequest(
      req.params.requestId,
      req.user.id,
      decision,
      rejectionReason
    );

    return res.status(200).json({
      success: true,
      message:
        decision === "ACCEPTED"
          ? "Restaurant registration accepted successfully"
          : "Restaurant registration rejected successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
