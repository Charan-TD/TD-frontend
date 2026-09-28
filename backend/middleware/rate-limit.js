import rateLimit from "express-rate-limit";

export const employeeLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes

  max: 5, // Maximum 5 login attempts

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});

export const employeeRefreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes

  max: 20, // Maximum 20 refresh requests

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many token refresh requests. Please try again later."
  }
});