import pool from "../config/database.js";

/**
 * Find a customer by phone number.
 */
export const findCustomerByPhone = async (phone) => {
  const query = `
    SELECT
      id,
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
    FROM customer_users
    WHERE phone = $1
      AND user_type = 'CUSTOMER'
    LIMIT 1
  `;

  const result = await pool.query(query, [phone]);

  return result.rows[0] || null;
};

/**
 * Create a new customer using only the phone number.
 */
export const createCustomer = async (phone) => {
  const query = `
    INSERT INTO customer_users (
      phone,
      user_type
    )
    VALUES ($1, 'CUSTOMER')
    RETURNING
      id,
      phone,
      email,
      full_name,
      profile_image_url,
      date_of_birth,
      gender,
      status,
      created_at,
      updated_at,
      user_type
  `;

  const result = await pool.query(query, [phone]);

  return result.rows[0];
};

/**
 * Invalidate any previous pending OTP challenges
 * for this phone number.
 */
export const invalidatePreviousOtpChallenges = async (phone) => {
  const query = `
    DELETE FROM auth_otp_challenges
    WHERE phone = $1
      AND user_type = 'CUSTOMER'
      AND verified_at IS NULL
  `;

  await pool.query(query, [phone]);
};

/**
 * Create a new OTP challenge.
 */
export const createOtpChallenge = async ({
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
      'CUSTOMER'
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

/**
 * Find the latest active OTP challenge for a customer.
 */
export const findActiveOtpChallenge = async (phone) => {
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
      AND user_type = 'CUSTOMER'
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [phone]);

  return result.rows[0] || null;
};

/**
 * Increment OTP attempt count.
 */
export const incrementOtpAttempt = async (challengeId) => {
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

/**
 * Mark OTP challenge as successfully verified.
 */
export const markOtpChallengeVerified = async (challengeId) => {
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

/**
 * Development-only table holding the latest generated OTP.
 * It always contains at most one row.
 */
let testOtpTableReady;

const ensureTestOtpTable = () => {
  testOtpTableReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS test_otps (
      otp VARCHAR(6) NOT NULL
    )
  `).catch((error) => {
    testOtpTableReady = undefined;
    throw error;
  });

  return testOtpTableReady;
};

/**
 * Replace the stored test OTP with the latest one.
 */
export const saveLatestTestOtp = async (otp) => {
  await ensureTestOtpTable();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM test_otps");
    await client.query(
      "INSERT INTO test_otps (otp) VALUES ($1)",
      [otp]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get the latest stored test OTP.
 */
export const findLatestTestOtp = async () => {
  await ensureTestOtpTable();

  const result = await pool.query(
    "SELECT otp FROM test_otps LIMIT 1"
  );

  return result.rows[0] || null;
};
