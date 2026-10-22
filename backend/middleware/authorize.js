import { getEmployeeAuthorization } from "../repositories/auth.repository.js";

export const authorize = (resource, action) => {
  return async (req, res, next) => {
    try {
      // authenticate middleware must run before authorize
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required"
        });
      }

      if (!resource || !action) {
        return res.status(500).json({
          success: false,
          message: "Authorization configuration is invalid"
        });
      }

      // Combined permissions of every active role the employee holds.
      const role = await getEmployeeAuthorization(req.user.id);

      if (!role) {
        return res.status(403).json({
          success: false,
          message: "No active role assigned"
        });
      }

      const permissionCode = role.permission_code || {};

      const resourcePermissions = permissionCode[resource] || [];

      const allowed = resourcePermissions.includes(action);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action"
        });
      }

      // Store authorization information for downstream handlers if needed
      req.authorization = {
        roleId: role.role_id,
        roleName: role.role_name,
        resource,
        action
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};