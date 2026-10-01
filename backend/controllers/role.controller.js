import {
  getAllRoles,
  getRole,
  createRole as createRoleService,
  updateRole as updateRoleService,
  deleteRole as deleteRoleService
} from "../services/role.service.js";


/*
|--------------------------------------------------------------------------
| Get all roles
|--------------------------------------------------------------------------
*/
export const getRoles = async (req, res, next) => {
  try {
    const roles = await getAllRoles();

    res.status(200).json({
      success: true,
      data: roles
    });
  } catch (error) {
    next(error);
  }
};


/*
|--------------------------------------------------------------------------
| Get role by ID
|--------------------------------------------------------------------------
*/
export const getRoleById = async (req, res, next) => {
  try {
    const role = await getRole(
      req.params.roleId
    );

    res.status(200).json({
      success: true,
      data: role
    });
  } catch (error) {
    next(error);
  }
};


/*
|--------------------------------------------------------------------------
| Create role
|--------------------------------------------------------------------------
*/
export const createRole = async (req, res, next) => {
  try {
    const {
      roleName,
      description,
      permissions
    } = req.body;

    const role =
      await createRoleService({
        roleName,
        description,
        permissions
      });

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role
    });
  } catch (error) {
    next(error);
  }
};


/*
|--------------------------------------------------------------------------
| Update role
|--------------------------------------------------------------------------
*/
export const updateRole = async (req, res, next) => {
  try {
    const {
      roleName,
      description,
      permissions
    } = req.body;

    const role =
      await updateRoleService(
        req.params.roleId,
        {
          roleName,
          description,
          permissions
        }
      );

    res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: role
    });
  } catch (error) {
    next(error);
  }
};


/*
|--------------------------------------------------------------------------
| Delete role
|--------------------------------------------------------------------------
*/
export const deleteRole = async (req, res, next) => {
  try {
    const result =
      await deleteRoleService(
        req.params.roleId
      );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
};