import {
  createRestaurantRegistration,
  updateRestaurantRegistrationSection,
  getRestaurantRegistrationSection,
  getRestaurantRegistrationProgress,
  getRestaurantRegistrationReviewStatus,
  submitRestaurantRegistration
} from "../services/restaurantRegistration.service.js";

/**
 * Start restaurant registration.
 *
 * POST /api/v1/restaurants/registration
 */
export const createRestaurantRegistrationController = async (
  req,
  res,
  next
) => {
  try {
    const result = await createRestaurantRegistration(
      req.body,
      req.files
    );

    return res.status(201).json({
      success: true,
      message: "Restaurant registration created successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save a registration section.
 *
 * PUT /api/v1/restaurants/registration/:registrationId/sections/:section
 */
export const updateRestaurantRegistrationSectionController =
  async (req, res, next) => {
    try {
      const {
        registrationId,
        section
      } = req.params;

      const result =
        await updateRestaurantRegistrationSection(
          registrationId,
          section,
          req.body,
          req.files
        );

      return res.status(200).json({
        success: true,
        message: `${section} saved successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

export const getRestaurantRegistrationSectionController =
  async (req, res, next) => {
    try {
      const { registrationId, section } = req.params;
      const result = await getRestaurantRegistrationSection(
        registrationId,
        section
      );

      return res.status(200).json({
        success: true,
        message: `${section} fetched successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };


/**
 * Get registration progress.
 *
 * GET /api/v1/restaurants/registration/:registrationId/progress
 */
export const getRestaurantRegistrationProgressController =
  async (req, res, next) => {
    try {
      const {
        registrationId
      } = req.params;

      const result =
        await getRestaurantRegistrationProgress(
          registrationId
        );

      return res.status(200).json({
        success: true,
        message: "Registration progress fetched successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };


/**
 * Submit completed restaurant registration.
 *
 * POST /api/v1/restaurants/registration/:registrationId/submit
 */
export const submitRestaurantRegistrationController =
  async (req, res, next) => {
    try {
      const {
        registrationId
      } = req.params;

      const result =
        await submitRestaurantRegistration(
          registrationId
        );

      return res.status(200).json({
        success: true,
        message: "Restaurant registration submitted successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

export const getRestaurantRegistrationReviewStatusController =
  async (req, res, next) => {
    try {
      const { registrationId } = req.params;
      const result = await getRestaurantRegistrationReviewStatus(
        registrationId
      );

      return res.status(200).json({
        success: true,
        message: "Registration review status fetched successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };