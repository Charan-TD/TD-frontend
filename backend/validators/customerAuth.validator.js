import { AppError } from "../utils/app-error.js";

export const validatePhone = (phone) => {
  if (!phone) {
    throw new AppError(
      "Phone number is required",
      400
    );
  }

  if (typeof phone !== "string") {
    throw new AppError(
      "Phone number must be a string",
      400
    );
  }

  const normalizedPhone =
    phone.trim();

  // E.164-style validation.
  // Example: +919876543210
  const phoneRegex =
    /^\+[1-9]\d{7,14}$/;

  if (!phoneRegex.test(normalizedPhone)) {
    throw new AppError(
      "Invalid phone number format. Use international format, e.g. +919876543210",
      400
    );
  }

  return normalizedPhone;
};

export const validateOtp = (otp) => {
  if (!otp) {
    throw new AppError(
      "OTP is required",
      400
    );
  }

  if (typeof otp !== "string") {
    throw new AppError(
      "OTP must be a string",
      400
    );
  }

  const normalizedOtp =
    otp.trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw new AppError(
      "OTP must be a 6-digit number",
      400
    );
  }

  return normalizedOtp;
};