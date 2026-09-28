import pool from "../config/database.js";

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

      const query = `
        SELECT
          r.id AS role_id,
          r.role_name,
          r.permission_code
        FROM employee_roles er
        INNER JOIN roles r
          ON r.id = er.role_id
        WHERE er.employee_id = $1
          AND er.status = 'active'
        LIMIT 1
      `;

      const result = await pool.query(query, [req.user.id]);

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: "No active role assigned"
        });
      }

      const role = result.rows[0];

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