import { validate as isUUID } from "uuid";

const ALLOWED_ACTIONS = [
  "read",
  "insert",
  "update",
  "delete"
];

/*
|--------------------------------------------------------------------------
| Validate role name
|--------------------------------------------------------------------------
*/
const validateRoleName = (roleName) => {
  if (
    typeof roleName !== "string" ||
    roleName.trim().length === 0
  ) {
    return "roleName is required";
  }

  return null;
};


/*
|--------------------------------------------------------------------------
| Validate permissions
|--------------------------------------------------------------------------
*/
const validatePermissions = (permissions) => {
  if (!Array.isArray(permissions)) {
    return "permissions must be an array";
  }

  if (permissions.length === 0) {
    return "At least one permission is required";
  }

  const permissionIds = new Set();

  for (const permission of permissions) {
    if (
      !permission ||
      typeof permission !== "object" ||
      Array.isArray(permission)
    ) {
      return "Each permission must be an object";
    }

    const {
      permissionId,
      actions
    } = permission;

    /*
    |--------------------------------------------------------------------------
    | Validate permission ID
    |--------------------------------------------------------------------------
    */
    if (
      typeof permissionId !== "string" ||
      !isUUID(permissionId)
    ) {
      return `Invalid permissionId: ${permissionId}`;
    }

    if (permissionIds.has(permissionId)) {
      return `Duplicate permissionId: ${permissionId}`;
    }

    permissionIds.add(permissionId);

    /*
    |--------------------------------------------------------------------------
    | Validate actions
    |--------------------------------------------------------------------------
    */
    if (!Array.isArray(actions)) {
      return `Actions must be an array for permissionId: ${permissionId}`;
    }

    if (actions.length === 0) {
      return `At least one action is required for permissionId: ${permissionId}`;
    }

    const uniqueActions = [
      ...new Set(actions)
    ];

    if (uniqueActions.length !== actions.length) {
      return `Duplicate actions are not allowed for permissionId: ${permissionId}`;
    }

    const invalidActions =
      actions.filter(
        (action) =>
          typeof action !== "string" ||
          !ALLOWED_ACTIONS.includes(action)
      );

    if (invalidActions.length > 0) {
      return (
        `Invalid action(s) for permissionId ${permissionId}: ` +
        invalidActions.join(", ")
      );
    }
  }

  return null;
};


/*
|--------------------------------------------------------------------------
| Create role validation
|--------------------------------------------------------------------------
*/
export const validateCreateRole = (req, res, next) => {
  const {
    roleName,
    permissions
  } = req.body;

  const roleNameError =
    validateRoleName(roleName);

  if (roleNameError) {
    return res.status(400).json({
      success: false,
      message: roleNameError
    });
  }

  const permissionsError =
    validatePermissions(permissions);

  if (permissionsError) {
    return res.status(400).json({
      success: false,
      message: permissionsError
    });
  }

  next();
};


/*
|--------------------------------------------------------------------------
| Update role validation
|--------------------------------------------------------------------------
*/
export const validateUpdateRole = (req, res, next) => {
  const {
    roleName,
    permissions
  } = req.body;

  /*
  |--------------------------------------------------------------------------
  | At least one field must be provided
  |--------------------------------------------------------------------------
  */
  if (
    roleName === undefined &&
    permissions === undefined &&
    req.body.description === undefined
  ) {
    return res.status(400).json({
      success: false,
      message: "At least one field must be provided"
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Validate role name if provided
  |--------------------------------------------------------------------------
  */
  if (roleName !== undefined) {
    const roleNameError =
      validateRoleName(roleName);

    if (roleNameError) {
      return res.status(400).json({
        success: false,
        message: roleNameError
      });
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Validate permissions if provided
  |--------------------------------------------------------------------------
  */
  if (permissions !== undefined) {
    const permissionsError =
      validatePermissions(permissions);

    if (permissionsError) {
      return res.status(400).json({
        success: false,
        message: permissionsError
      });
    }
  }

  next();
};


/*
|--------------------------------------------------------------------------
| Validate role ID
|--------------------------------------------------------------------------
*/
export const validateRoleId = (req, res, next) => {
  const { roleId } = req.params;

  if (
    typeof roleId !== "string" ||
    !isUUID(roleId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid role ID"
    });
  }

  next();
};