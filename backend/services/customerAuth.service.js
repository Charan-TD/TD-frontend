import argon2 from "argon2";

import {
  findCustomerByPhone,
  createCustomer,
  invalidatePreviousOtpChallenges,
  createOtpChallenge,
  findActiveOtpChallenge,
  incrementOtpAttempt,
  markOtpChallengeVerified,
  saveLatestTestOtp,
  findLatestTestOtp
} from "../repositories/customerAuth.repository.js";

import {
  generateAccessToken,
  generateRefreshToken
} from "./jwt.service.js";

import { AppError } from "../utils/app-error.js";

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

// Test OTP storage/lookup is disabled in production.
const isTestOtpEnabled = () =>
  process.env.NODE_ENV !== "production";

/**
 * Generate a random 6-digit OTP.
 */
const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;

  return Math.floor(
    Math.random() * (max - min + 1) + min
  ).toString();
};

/**
 * Generate and store customer OTP.
 *
 * No SMS provider is integrated yet, so outside production the
 * OTP is saved to the test_otps table for frontend testing.
 */
export const sendCustomerOtp = async (phone) => {
  const otp = generateOtp();

  const otpHash = await argon2.hash(otp);

  const expiresAt = new Date(
    Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
  );

  await invalidatePreviousOtpChallenges(phone);

  const challenge = await createOtpChallenge({
    phone,
    otpHash,
    expiresAt
  });

  if (isTestOtpEnabled()) {
    await saveLatestTestOtp(otp);
  }

  return {
    challengeId: challenge.id,
    expiresAt: challenge.expires_at,
    otp: otp,
  };
};

/**
 * Retrieve the latest generated OTP (non-production only).
 */
export const getLatestTestOtp = async () => {
  if (!isTestOtpEnabled()) {
    throw new AppError("Not found", 404);
  }

  const testOtp = await findLatestTestOtp();

  if (!testOtp) {
    throw new AppError(
      "No OTP has been generated yet",
      404
    );
  }

  return { otp: testOtp.otp };
};

/**
 * Verify customer OTP.
 *
 * If the phone number does not exist,
 * a new customer is created.
 *
 * If the phone number already exists,
 * the existing customer is logged in.
 */
export const verifyCustomerOtp = async (
  phone,
  otp
) => {
  const challenge =
    await findActiveOtpChallenge(phone);

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
    await incrementOtpAttempt(
      challenge.id
    );

    throw new AppError(
      "Invalid OTP",
      400
    );
  }

  await markOtpChallengeVerified(
    challenge.id
  );

  let customer =
    await findCustomerByPhone(phone);

  let isNewCustomer = false;

  if (!customer) {
    customer =
      await createCustomer(phone);

    isNewCustomer = true;
  }

  const accessToken =
    generateAccessToken({
      sub: customer.id,
      user_type: "customer",
      token_type: "access"
    });

  const refreshToken =
    generateRefreshToken({
      sub: customer.id,
      user_type: "customer",
      token_type: "refresh"
    });

  return {
    customer: {
      id: customer.id,
      phone: customer.phone,
      email: customer.email,
      full_name: customer.full_name,
      profile_image_url:
        customer.profile_image_url,
      date_of_birth:
        customer.date_of_birth,
      gender: customer.gender,
      status: customer.status,
      user_type: customer.user_type
    },

    isNewCustomer,

    accessToken,

    refreshToken
  };
};