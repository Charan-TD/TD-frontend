import {
  sendRestaurantOtp,
  verifyRestaurantOtp,
  loginRestaurant,
} from "../services/restaurantAuth.service.js";
import {
  requestRestaurantPasswordReset,
  resetRestaurantPassword,
  changeRestaurantPassword
} from "../services/restaurantPassword.service.js";

import {
  validateRestaurantPhone,
  validateRestaurantOtp,
  validateRestaurantEmail,
  validateRestaurantPassword
} from "../validators/restaurantAuth.validator.js";

export const sendRestaurantOtpController = async (
  req,
  res,
  next
) => {
  try {
    const phone = validateRestaurantPhone(
      req.body?.phone
    );

    const result =
      await sendRestaurantOtp(phone);

    return res.status(200).json({
      success: true,
      message: "OTP generated successfully",
      data: {
        challengeId: result.challengeId,
        otp: result.otp,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRestaurantOtpController = async (
  req,
  res,
  next
) => {
  try {
    const phone = validateRestaurantPhone(
      req.body?.phone
    );

    const otp = validateRestaurantOtp(
      req.body?.otp
    );

    const result =
      await verifyRestaurantOtp(
        phone,
        otp
      );

    return res.status(200).json({
      success: true,
      message: "Restaurant logged in successfully",
      data: {
        restaurantUser:
          result.restaurantUser,
        accessToken:
          result.accessToken,
        refreshToken:
          result.refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const loginRestaurantController = async (req, res, next) => {
  try {
    const email = validateRestaurantEmail(req.body?.email);
    const password = validateRestaurantPassword(req.body?.password);

    const result = await loginRestaurant(email, password);

    return res.status(200).json({
      success: true,
      message: "Restaurant logged in successfully",
      data: {
        restaurantUser: result.restaurantUser,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotRestaurantPasswordController = async (
  req,
  res,
  next
) => {
  try {
    const email = validateRestaurantEmail(req.body?.email);
    const result = await requestRestaurantPasswordReset(email);

    return res.status(200).json({
      success: true,
      message:
        "If an active account exists with this email, password reset instructions have been generated.",
      ...(result && process.env.NODE_ENV !== "production"
        ? { data: result }
        : { data: result})  // later change to { data: null } in production
    });
  } catch (error) {
    next(error);
  }
};

export const resetRestaurantPasswordController = async (
  req,
  res,
  next
) => {
  try {
    const { token, newPassword } = req.body || {};
    validateRestaurantPassword(newPassword);

    await resetRestaurantPassword(token, newPassword);

    return res.status(200).json({
      success: true,
      message: "Restaurant password reset successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const changeRestaurantPasswordController = async (
  req,
  res,
  next
) => {
  try {
    const { current_password, new_password } = req.body || {};
    validateRestaurantPassword(current_password);
    validateRestaurantPassword(new_password);

    await changeRestaurantPassword(
      req.user.id,
      current_password,
      new_password
    );

    return res.status(200).json({
      success: true,
      message: "Restaurant password changed successfully"
    });
  } catch (error) {
    next(error);
  }
};