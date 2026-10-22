
import {
  loginEmployee,
  refreshEmployeeAccessToken,
  changeEmployeePassword
} from "../services/auth.service.js";

import {
  requestEmployeePasswordReset,
  resetEmployeePassword
} from "../services/password-reset.service.js";

// POST /api/v1/auth/employee/login
export const employeeLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginEmployee(email, password);

    return res.status(200).json({
      success: true,
      message: "Employee login successful",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/auth/employee/me
export const getCurrentEmployee = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated employee",
    data: {
      employee: req.user
    }
  });
};

// POST /api/v1/auth/employee/refresh
export const refreshEmployeeToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const result = await refreshEmployeeAccessToken(
      refreshToken
    );

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/employee/forgot-password
export const forgotEmployeePassword = async (
  req,
  res,
  next
) => {
  try {
    const { email } = req.body;

    const result = await requestEmployeePasswordReset(
      email
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      ...(result.data && {
        data: result.data
      })
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/employee/reset-password
export const resetEmployeePasswordController = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      token,
      newPassword
    } = req.body;

    const result = await resetEmployeePassword({
      email,
      token,
      newPassword
    });

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/auth/employee/change-password
export const changePassword = async (
  req,
  res,
  next
) => {
  try {
    const {
      current_password,
      new_password
    } = req.body;

    const result = await changeEmployeePassword(
      req.user.id,
      current_password,
      new_password
    );

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};
