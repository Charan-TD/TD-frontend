
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmployeeLogin = (
  req,
  res,
  next
) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  if (typeof password !== "string" || !password) {
    return res.status(400).json({
      success: false,
      message: "Password is required"
    });
  }

  req.body.email = normalizedEmail;
  next();
};

export const validateEmployeeRefresh = (
  req,
  res,
  next
) => {
  const { refreshToken } = req.body ?? {};

  if (
    typeof refreshToken !== "string" ||
    !refreshToken.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required"
    });
  }

  next();
};

export const validateForgotEmployeePassword = (
  req,
  res,
  next
) => {
  const { email } = req.body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  req.body.email = normalizedEmail;
  next();
};

export const validateResetEmployeePassword = (
  req,
  res,
  next
) => {
  const {
    email,
    token,
    newPassword
  } = req.body ?? {};

  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Valid email is required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  if (
    typeof token !== "string" ||
    !/^[a-fA-F0-9]{64}$/.test(token)
  ) {
    return res.status(400).json({
      success: false,
      message: "Valid reset token is required"
    });
  }

  if (typeof newPassword !== "string" || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "New password is required"
    });
  }

  if (
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    return res.status(400).json({
      success: false,
      message: "New password must be between 8 and 128 characters"
    });
  }

  req.body.email = normalizedEmail;
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
  } = req.body ?? {};

  if (
    typeof current_password !== "string" ||
    !current_password
  ) {
    return res.status(400).json({
      success: false,
      message: "Current password is required"
    });
  }

  if (
    typeof new_password !== "string" ||
    !new_password
  ) {
    return res.status(400).json({
      success: false,
      message: "New password is required"
    });
  }

  if (
    new_password.length < 8 ||
    new_password.length > 128
  ) {
    return res.status(400).json({
      success: false,
      message: "New password must be between 8 and 128 characters"
    });
  }

  if (current_password === new_password) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from current password"
    });
  }

  next();
};
