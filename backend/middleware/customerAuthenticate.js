import { verifyAccessToken } from "../services/jwt.service.js";
import { findCustomerByPhone } from "../repositories/customerAuth.repository.js";
import pool from "../config/database.js";

export const customerAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required"
      });
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format"
      });
    }

    const decoded = verifyAccessToken(token);

    if (
      decoded.user_type !== "customer" ||
      decoded.token_type !== "access"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid customer access token"
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        phone,
        email,
        full_name,
        profile_image_url,
        date_of_birth,
        gender,
        status,
        user_type
      FROM customer_users
      WHERE id = $1
        AND user_type = 'CUSTOMER'
      LIMIT 1
      `,
      [decoded.sub]
    );

    const customer = result.rows[0];

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Customer not found"
      });
    }

    if (customer.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        message: "Customer account is not active"
      });
    }

    req.customer = customer;

    next();
  } catch (error) {
    console.error("Customer authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired customer access token"
    });
  }
};