import { AppError } from "../utils/app-error.js";

export const validateRestaurantPhone = (phone) => {
  if (phone === undefined || phone === null || phone === "") {
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

  const normalizedPhone = phone.trim();

  const phoneRegex = /^\+?[1-9]\d{9,14}$/;

  if (!phoneRegex.test(normalizedPhone)) {
    throw new AppError(
      "Invalid phone number format. Use 10 to 15 digits with an optional leading +, e.g. +919876543210",
      400
    );
  }

  return normalizedPhone;
};

export const validateRestaurantOtp = (otp) => {
  if (otp === undefined || otp === null || otp === "") {
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

  const normalizedOtp = otp.trim();

  if (!/^\d{6}$/.test(normalizedOtp)) {
    throw new AppError(
      "OTP must be a 6-digit number",
      400
    );
  }

  return normalizedOtp;
};

export const validateRestaurantEmail = (email) => {
  if (email === undefined || email === null || email === "") {
    throw new AppError("Email is required", 400);
  }

  if (typeof email !== "string") {
    throw new AppError("Email must be a string", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const parts = normalizedEmail.split("@");

  if (parts.length !== 2) {
    throw new AppError("Invalid email address", 400);
  }

  const [localPart, domain] = parts;
  const domainLabels = domain.split(".");
  const isValid =
    normalizedEmail.length <= 254 &&
    localPart.length > 0 &&
    localPart.length <= 64 &&
    !localPart.startsWith(".") &&
    !localPart.endsWith(".") &&
    !localPart.includes("..") &&
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart) &&
    domainLabels.length >= 2 &&
    domainLabels.every((label) =>
      label.length <= 63 &&
      /^[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?$/i.test(label)
    ) &&
    /^[A-Z]{2,63}$/i.test(domainLabels.at(-1));

  if (!isValid) {
    throw new AppError("Invalid email address", 400);
  }

  return normalizedEmail;
};

export const validateRestaurantPassword = (password) => {
  if (typeof password !== "string") {
    throw new AppError("Password is required and must be a string", 400);
  }

  if (password.trim().length === 0) {
    throw new AppError("Password is required", 400);
  }

  if (password.length < 8 || password.length > 128) {
    throw new AppError(
      "Password must be between 8 and 128 characters",
      400
    );
  }

  return password;
};