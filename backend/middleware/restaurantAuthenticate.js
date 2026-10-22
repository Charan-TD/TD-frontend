import { verifyAccessToken } from "../services/jwt.service.js";
import { findRestaurantUserById } from "../repositories/restaurantAuth.repository.js";

export const authenticateRestaurant = async (req, res, next) => {
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

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token"
    });
  }

  if (
    decoded.user_type !== "restaurant" ||
    decoded.token_type !== "access"
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid access token"
    });
  }

  try {
    const restaurant = await findRestaurantUserById(decoded.sub);

    if (
      !restaurant ||
      !["ACTIVE", "ACCEPTED"].includes(restaurant.status)
    ) {
      return res.status(401).json({
        success: false,
        message: "Restaurant account is not active"
      });
    }

    if (!restaurant.restaurant_id) {
      return res.status(403).json({
        success: false,
        message: "Restaurant account is not linked to a restaurant ID"
      });
    }

    req.user = {
      id: restaurant.id,
      restaurant_id: restaurant.restaurant_id,
      user_type: "restaurant"
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
