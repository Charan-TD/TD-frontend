import {
  loginEmployee,
  refreshEmployeeAccessToken
} from "../services/auth.service.js";

import {
  requestEmployeePasswordReset,
  resetEmployeePassword
} from "../services/password-reset.service.js";

import {
  changeEmployeePassword
} from "../services/auth.service.js";

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

export const getCurrentEmployee = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated employee",
    data: {
      employee: req.user
    }
  });
};

export const refreshEmployeeToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const result =
      await refreshEmployeeAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed successfully",
      data: result
    });

  } catch (error) {
    next(error);
  }
};

export const forgotEmployeePassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    await requestEmployeePasswordReset(email);

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, password reset instructions have been generated."
    });
  } catch (error) {
    next(error);
  }
};


export const resetEmployeePasswordController = async (
  req,
  res,
  next
) => {
  try {
    const {
      token,
      newPassword
    } = req.body;

    await resetEmployeePassword({
      token,
      newPassword
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    next(error);
  }
};

export const validateForgotEmployeePassword = (req, res, next) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      success: false,
      message: "Valid email is required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  req.body.email = normalizedEmail;

  next();
};


export const validateResetEmployeePassword = (req, res, next) => {
  const {
    token,
    newPassword
  } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({
      success: false,
      message: "Reset token is required"
    });
  }

  if (
    !newPassword ||
    typeof newPassword !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "New password is required"
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters"
    });
  }

  next();
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

    const result =
      await changeEmployeePassword(
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