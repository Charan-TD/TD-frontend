import jwt from "jsonwebtoken";
import "dotenv/config";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || "15m";

const REFRESH_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "30d";

// Validate JWT configuration
if (!ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is not configured");
}

if (!REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is not configured");
}

if (ACCESS_SECRET === REFRESH_SECRET) {
  throw new Error(
    "JWT access and refresh secrets must be different"
  );
}

// Generate access token
export const generateAccessToken = (payload) => {
  if (
    payload.user_type === "employee" &&
    payload.token_version === undefined
  ) {
    throw new Error(
      "token_version is required for employee access tokens"
    );
  }

  return jwt.sign(
    payload,
    ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRES_IN
    }
  );
};

export const generateRefreshToken = (payload) => {
  if (
    payload.user_type === "employee" &&
    payload.token_version === undefined
  ) {
    throw new Error(
      "token_version is required for employee refresh tokens"
    );
  }

  return jwt.sign(
    payload,
    REFRESH_SECRET,
    {
      expiresIn: REFRESH_EXPIRES_IN
    }
  );
};

// Verify access token
export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

// Verify refresh token
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};