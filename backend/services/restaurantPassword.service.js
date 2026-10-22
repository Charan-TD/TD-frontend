
import { randomBytes, createHash } from "node:crypto";
import argon2 from "argon2";

import {
  findRestaurantUserByEmail,
  findRestaurantUserById,
  updateRestaurantUserPassword
} from "../repositories/restaurantAuth.repository.js";

import { AppError } from "../utils/app-error.js";

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Temporary in-memory token storage.
// Tokens disappear when the Node.js server restarts.
const passwordResetTokens = new Map();

const hashResetToken = (token) =>
  createHash("sha256").update(token).digest("hex");

const validateNewPassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new AppError(
      "Password must be between 8 and 128 characters",
      400
    );
  }
};

// ==========================================
// FORGOT PASSWORD
// ==========================================

export const requestRestaurantPasswordReset = async (email) => {
  // if (process.env.NODE_ENV === "production") {
  //   throw new AppError(
  //     "Restaurant password reset delivery is not configured",
  //     503
  //   );
  // }

  const restaurant = await findRestaurantUserByEmail(email);

  // Generic response prevents account enumeration.
  if (
    !restaurant ||
    !["ACTIVE", "ACCEPTED"].includes(restaurant.status)
  ) {
    return null;
  }

  const resetToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(resetToken);
  const expiresAt = Date.now() + RESET_TOKEN_EXPIRY_MS;

  // Remove expired tokens and previous tokens for this account.
  for (const [hash, record] of passwordResetTokens) {
    if (
      record.expiresAt <= Date.now() ||
      record.restaurantUserId === restaurant.id
    ) {
      passwordResetTokens.delete(hash);
    }
  }

  passwordResetTokens.set(tokenHash, {
    restaurantUserId: restaurant.id,
    expiresAt
  });

  return {
    resetToken,
    expiresAt: new Date(expiresAt).toISOString()
  };
};

// ==========================================
// RESET PASSWORD
// ==========================================

export const resetRestaurantPassword = async (
  token,
  newPassword
) => {
  if (
    typeof token !== "string" ||
    !/^[0-9a-fA-F]{64}$/.test(token)
  ) {
    throw new AppError("Invalid reset token", 400);
  }

  validateNewPassword(newPassword);

  const tokenHash = hashResetToken(token.toLowerCase());
  const resetRecord = passwordResetTokens.get(tokenHash);

  if (!resetRecord || resetRecord.expiresAt <= Date.now()) {
    passwordResetTokens.delete(tokenHash);
    throw new AppError("Invalid or expired reset token", 400);
  }

  // Prevent two requests from using the same token.
  if (resetRecord.processing) {
    throw new AppError("Reset token is already being used", 409);
  }

  resetRecord.processing = true;

  try {
    const restaurant = await findRestaurantUserById(
      resetRecord.restaurantUserId
    );

    if (
      !restaurant ||
      !["ACTIVE", "ACCEPTED"].includes(restaurant.status)
    ) {
      throw new AppError(
        "Restaurant account not found or inactive",
        400
      );
    }

    const passwordHash = await argon2.hash(newPassword);

    await updateRestaurantUserPassword(
      restaurant.id,
      passwordHash
    );

    // Consume the token only after a successful update.
    passwordResetTokens.delete(tokenHash);
  } catch (error) {
    resetRecord.processing = false;
    throw error;
  }
};

// ==========================================
// CHANGE PASSWORD
// ==========================================

export const changeRestaurantPassword = async (
  restaurantId,
  currentPassword,
  newPassword
) => {
  if (
    typeof currentPassword !== "string" ||
    !currentPassword
  ) {
    throw new AppError(
      "Current password is required",
      400
    );
  }

  validateNewPassword(newPassword);

  if (currentPassword === newPassword) {
    throw new AppError(
      "New password must be different from current password",
      400
    );
  }

  const restaurant = await findRestaurantUserById(restaurantId);

  if (!restaurant) {
    throw new AppError(
      "Restaurant account not found",
      404
    );
  }

  if (!["ACTIVE", "ACCEPTED"].includes(restaurant.status)) {
    throw new AppError(
      "Restaurant account is not active",
      403
    );
  }

  if (!restaurant.password_hash) {
    throw new AppError(
      "Password login is not configured for this account",
      400
    );
  }

  const passwordValid = await argon2.verify(
    restaurant.password_hash,
    currentPassword
  );

  if (!passwordValid) {
    throw new AppError(
      "Current password is incorrect",
      401
    );
  }

  await updateRestaurantUserPassword(
    restaurantId,
    await argon2.hash(newPassword)
  );
};
