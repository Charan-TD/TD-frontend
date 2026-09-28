import { verifyAccessToken } from "../services/jwt.service.js";
import { findEmployeeById } from "../repositories/auth.repository.js";

export const authenticate = async (req, res, next) => {
  try {
    // 1. Get Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required"
      });
    }

    // 2. Check Bearer format
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format"
      });
    }

    // 3. Verify JWT
    const decoded = verifyAccessToken(token);

    // 4. Make sure this is an employee access token
    if (
      decoded.user_type !== "employee" ||
      decoded.token_type !== "access"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token"
      });
    }

    // 5. Get employee from database
    const employee = await findEmployeeById(decoded.sub);

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Employee not found"
      });
    }

    if (
  decoded.token_version !== employee.token_version
) {
  return res.status(401).json({
    success: false,
    message: "Access token is no longer valid"
  });
}

    // 6. Check employee status
    if (employee.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Employee account is not active"
      });
    }

    // 7. Attach authenticated user to request
    req.user = {
      id: employee.id,
      emp_id: employee.emp_id,
      name: employee.name,
      email: employee.email,
      profile_img_url: employee.profile_img_url,
      role_id: decoded.role_id
    };

    // 8. Continue to controller
    next();

  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token"
    });
  }
};