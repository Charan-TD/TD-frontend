
import pool from "../config/database.js";

// ==========================================
// 1. FIND RESTAURANT USER BY PHONE
// ==========================================

export const findRestaurantUserByPhone = async (phone) => {
  const query = `
    SELECT
      id,
      restaurant_id,
      owner_mobile AS phone,
      restaurant_email AS email,
      owner_name AS full_name,
      logo_id AS profile_image_url,
      admin_restaurant_status AS status,
      'OWNER'::text AS role,
      'RESTAURANT'::text AS user_type,
      created_at,
      updated_at
    FROM public.restaurants
    WHERE owner_mobile = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [phone]);

  return result.rows[0] || null;
};

// ==========================================
// 2. INVALIDATE PREVIOUS OTP CHALLENGES
// ==========================================

export const invalidatePreviousRestaurantOtpChallenges = async (
  phone
) => {
  await pool.query(
    `
    DELETE FROM auth_otp_challenges
    WHERE phone = $1
      AND user_type = 'RESTAURANT'
      AND verified_at IS NULL
    `,
    [phone]
  );
};

// ==========================================
// 3. CREATE RESTAURANT OTP CHALLENGE
// ==========================================

export const createRestaurantOtpChallenge = async ({
  phone,
  otpHash,
  expiresAt
}) => {
  const query = `
    INSERT INTO auth_otp_challenges (
      phone,
      otp_hash,
      expires_at,
      attempt_count,
      max_attempts,
      user_type
    )
    VALUES (
      $1,
      $2,
      $3,
      0,
      5,
      'RESTAURANT'
    )
    RETURNING
      id,
      phone,
      expires_at,
      attempt_count,
      max_attempts,
      verified_at,
      created_at,
      user_type
  `;

  const result = await pool.query(query, [
    phone,
    otpHash,
    expiresAt
  ]);

  return result.rows[0];
};

// ==========================================
// 4. FIND ACTIVE OTP CHALLENGE
// ==========================================

export const findActiveRestaurantOtpChallenge = async (
  phone
) => {
  const query = `
    SELECT
      id,
      phone,
      otp_hash,
      expires_at,
      attempt_count,
      max_attempts,
      verified_at,
      created_at,
      user_type
    FROM auth_otp_challenges
    WHERE phone = $1
      AND user_type = 'RESTAURANT'
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [phone]);

  return result.rows[0] || null;
};

// ==========================================
// 5. INCREMENT OTP ATTEMPT COUNT
// ==========================================

export const incrementRestaurantOtpAttempt = async (
  challengeId
) => {
  const query = `
    UPDATE auth_otp_challenges
    SET attempt_count = attempt_count + 1
    WHERE id = $1
    RETURNING
      id,
      attempt_count,
      max_attempts
  `;

  const result = await pool.query(query, [challengeId]);

  return result.rows[0] || null;
};

// ==========================================
// 6. MARK OTP VERIFIED
// ==========================================

export const markRestaurantOtpChallengeVerified = async (
  challengeId
) => {
  const query = `
    UPDATE auth_otp_challenges
    SET verified_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      phone,
      verified_at
  `;

  const result = await pool.query(query, [challengeId]);

  return result.rows[0] || null;
};

// ==========================================
// 7. FIND RESTAURANT USER BY EMAIL
// ==========================================

export const findRestaurantUserByEmail = async (email) => {
  const query = `
    SELECT
      id,
      restaurant_id,
      owner_mobile AS phone,
      restaurant_email AS email,
      owner_name AS full_name,
      logo_id AS profile_image_url,
      admin_restaurant_status AS status,
      'OWNER'::text AS role,
      'RESTAURANT'::text AS user_type,
      password_hash,
      created_at,
      updated_at
    FROM public.restaurants
    WHERE LOWER(restaurant_email) = LOWER($1)
    LIMIT 1
  `;

  const result = await pool.query(query, [
    email.trim()
  ]);

  return result.rows[0] || null;
};

// ==========================================
// 8. FIND RESTAURANT USER BY ID
// ==========================================

export const findRestaurantUserById = async (
  restaurantUserId
) => {
  const query = `
    SELECT
      id,
      restaurant_id,
      owner_mobile AS phone,
      restaurant_email AS email,
      owner_name AS full_name,
      admin_restaurant_status AS status,
      password_hash
    FROM public.restaurants
    WHERE id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [
    restaurantUserId
  ]);

  return result.rows[0] || null;
};

// ==========================================
// 9. UPDATE RESTAURANT PASSWORD
// ==========================================

// Called by the temporary in-memory reset-token flow.
// The user ID comes from public.restaurants.id.

export const updateRestaurantUserPassword = async (
  restaurantUserId,
  passwordHash
) => {
  const result = await pool.query(
    `
    UPDATE public.restaurants
    SET
      password_hash = $1,
      updated_at = NOW()
    WHERE id = $2
      AND admin_restaurant_status::text IN ('ACTIVE', 'ACCEPTED')
    RETURNING id
    `,
    [passwordHash, restaurantUserId]
  );

  if (result.rowCount !== 1) {
    throw new Error(
      "Restaurant user not found or inactive"
    );
  }

  return result.rows[0];
};

// ==========================================
// 10. BACKWARD-COMPATIBLE PASSWORD UPDATE
// ==========================================

// Retained in case other parts of the project import
// updateRestaurantPassword.

export const updateRestaurantPassword = async (
  restaurantUserId,
  passwordHash
) => {
  return updateRestaurantUserPassword(
    restaurantUserId,
    passwordHash
  );
};
