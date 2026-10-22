import {
  randomInt,
  randomBytes,
  createHash
} from "node:crypto";
import argon2 from "argon2";

import {
  findRestaurantUserByPhone,
  findRestaurantUserByEmail,
  invalidatePreviousRestaurantOtpChallenges,
  createRestaurantOtpChallenge,
  findActiveRestaurantOtpChallenge,
  incrementRestaurantOtpAttempt,
  markRestaurantOtpChallengeVerified,
  updateRestaurantUserPassword
} from "../repositories/restaurantAuth.repository.js";


import {
  generateAccessToken,
  generateRefreshToken
} from "./jwt.service.js";

import { AppError } from "../utils/app-error.js";

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

const passwordResetTokens = new Map();

const hashResetToken = (token) =>
  createHash("sha256")
    .update(token)
    .digest("hex");

const generateOtp = () =>
  randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();

export const sendRestaurantOtp = async (phone) => {
  /**if (process.env.NODE_ENV === "production") {
    throw new AppError(
      "Restaurant OTP delivery is not configured",
      503
    );
  }**/

  const restaurantUser =
    await findRestaurantUserByPhone(phone);

  if (!restaurantUser) {
    throw new AppError(
      "Restaurant account not found",
      404
    );
  }

  if (!["ACTIVE", "ACCEPTED"].includes(restaurantUser.status)) {
    throw new AppError(
      "Restaurant account is not active",
      403
    );
  }

  const otp = generateOtp();

  const otpHash = await argon2.hash(otp);

  const expiresAt = new Date(
    Date.now() +
      OTP_EXPIRY_MINUTES * 60 * 1000
  );

  await invalidatePreviousRestaurantOtpChallenges(
    phone
  );

  const challenge =
    await createRestaurantOtpChallenge({
      phone,
      otpHash,
      expiresAt
    });

  return {
    challengeId: challenge.id,
    otp,
    expiresAt: challenge.expires_at
  };
};

export const verifyRestaurantOtp = async (
  phone,
  otp
) => {
  const challenge =
    await findActiveRestaurantOtpChallenge(phone);

  if (!challenge) {
    throw new AppError(
      "OTP not found or already used",
      400
    );
  }

  if (
    new Date(challenge.expires_at) <=
    new Date()
  ) {
    throw new AppError(
      "OTP has expired",
      400
    );
  }

  if (
    challenge.attempt_count >=
    challenge.max_attempts
  ) {
    throw new AppError(
      "Maximum OTP attempts exceeded",
      400
    );
  }

  const isValidOtp =
    await argon2.verify(
      challenge.otp_hash,
      otp
    );

  if (!isValidOtp) {
    await incrementRestaurantOtpAttempt(
      challenge.id
    );

    throw new AppError(
      "Invalid OTP",
      400
    );
  }

  await markRestaurantOtpChallengeVerified(
    challenge.id
  );

  const restaurantUser =
    await findRestaurantUserByPhone(phone);

  if (!restaurantUser) {
    throw new AppError(
      "Restaurant account not found",
      404
    );
  }

  if (!["ACTIVE", "ACCEPTED"].includes(restaurantUser.status)) {
    throw new AppError(
      "Restaurant account is not active",
      403
    );
  }

  const accessToken =
    generateAccessToken({
      sub: restaurantUser.id,
      restaurant_id: restaurantUser.restaurant_id,
      user_type: "restaurant",
      token_type: "access"
    });

  const refreshToken =
    generateRefreshToken({
      sub: restaurantUser.id,
      restaurant_id: restaurantUser.restaurant_id,
      user_type: "restaurant",
      token_type: "refresh"
    });

  return {
    restaurantUser: {
      id: restaurantUser.id,
      restaurant_id:
        restaurantUser.restaurant_id,
      phone: restaurantUser.phone,
      email: restaurantUser.email,
      full_name: restaurantUser.full_name,
      role: restaurantUser.role,
      status: restaurantUser.status,
      profile_image_url:
        restaurantUser.profile_image_url,
      user_type: restaurantUser.user_type
    },
    accessToken,
    refreshToken
  };
};

export const loginRestaurant = async (
  email,
  password
) => {
  const restaurantUser =
    await findRestaurantUserByEmail(email);

  if (!restaurantUser) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  if (!["ACTIVE", "ACCEPTED"].includes(restaurantUser.status)) {
    throw new AppError(
      "Restaurant account is not active",
      403
    );
  }

  if (!restaurantUser.password_hash) {
    throw new AppError(
      "Password login is not configured for this account",
      400
    );
  }

  const passwordValid =
    await argon2.verify(
      restaurantUser.password_hash,
      password
    );

  if (!passwordValid) {
    throw new AppError(
      "Invalid email or password",
      401
    );
  }

  const accessToken =
    generateAccessToken({
      sub: restaurantUser.id,
      restaurant_id: restaurantUser.restaurant_id,
      user_type: "restaurant",
      token_type: "access"
    });

  const refreshToken =
    generateRefreshToken({
      sub: restaurantUser.id,
      restaurant_id: restaurantUser.restaurant_id,
      user_type: "restaurant",
      token_type: "refresh"
    });

  return {
    restaurantUser: {
      id: restaurantUser.id,
      restaurant_id:
        restaurantUser.restaurant_id,
      phone: restaurantUser.phone,
      email: restaurantUser.email,
      full_name: restaurantUser.full_name,
      role: restaurantUser.role,
      status: restaurantUser.status,
      profile_image_url:
        restaurantUser.profile_image_url,
      user_type: restaurantUser.user_type
    },
    accessToken,
    refreshToken
  };
};

