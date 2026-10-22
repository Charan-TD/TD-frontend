import {
  sendCustomerOtp,
  verifyCustomerOtp,
  getLatestTestOtp
} from "../services/customerAuth.service.js";

import {
  validatePhone,
  validateOtp
} from "../validators/customerAuth.validator.js";

/**
 * Send customer OTP
 */
export const sendCustomerOtpController = async (
  req,
  res,
  next
) => {
  try {
    const phone =
      validatePhone(req.body.phone);

    const result =
      await sendCustomerOtp(phone);

    return res.status(200).json({
      success: true,
      message: "OTP generated successfully",
      data: {
        ...result
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve the latest generated OTP for frontend testing.
 */
export const getCustomerTestOtpController = async (
  req,
  res,
  next
) => {
  try {
    const result = await getLatestTestOtp();

    return res.status(200).json({
      success: true,
      message: "OTP retrieved successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify customer OTP
 */
export const verifyCustomerOtpController = async (
  req,
  res,
  next
) => {
  try {
    const phone =
      validatePhone(req.body.phone);

    const otp =
      validateOtp(req.body.otp);

    const result =
      await verifyCustomerOtp(
        phone,
        otp
      );

    return res.status(200).json({
      success: true,
      message: result.isNewCustomer
        ? "Customer registered and logged in successfully"
        : "Customer logged in successfully",

      data: {
        customer: result.customer,
        isNewCustomer: result.isNewCustomer,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};