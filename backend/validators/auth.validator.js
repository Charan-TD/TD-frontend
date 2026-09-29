export const validateEmployeeLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      success: false,
      message: "Valid email is required"
    });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Password is required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  req.body.email = normalizedEmail;

  next();
};


export const validateEmployeeRefresh = (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required"
    });
  }

  next();
};


export const validateForgotEmployeePassword = (req, res, next) => {
  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({
      success: false,
      message: "Valid email is required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  req.body.email = normalizedEmail;

  next();
};


export const validateResetEmployeePassword = (req, res, next) => {
  const {
    token,
    newPassword
  } = req.body;

  if (!token || typeof token !== "string") {
    return res.status(400).json({
      success: false,
      message: "Reset token is required"
    });
  }

  if (!newPassword || typeof newPassword !== "string") {
    return res.status(400).json({
      success: false,
      message: "New password is required"
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters"
    });
  }

  next();
};

export const validateChangePassword = (
  req,
  res,
  next
) => {
  const {
    current_password,
    new_password
  } = req.body;

  if (
    !current_password ||
    typeof current_password !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Current password is required"
    });
  }

  if (
    !new_password ||
    typeof new_password !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "New password is required"
    });
  }

  if (new_password.length < 8) {
    return res.status(400).json({
      success: false,
      message:
        "New password must be at least 8 characters"
    });
  }

  if (new_password.length > 128) {
    return res.status(400).json({
      success: false,
      message:
        "New password must not exceed 128 characters"
    });
  }

  next();
};