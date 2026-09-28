import type { DbPermission } from "../models/employee";

export type EmployeeServiceRole = {
  id: string;
  name: string;
  description: string;
  permissions: DbPermission[];
  permissionIds: string[];
};

export const employeeService = {
  getRoles: (): EmployeeServiceRole[] => {
    /*
     * Roles are now loaded from Supabase through rolesApi.ts.
     *
     * This service is kept only for compatibility with any
     * older imports. It no longer contains hard-coded roles.
     */
    return [];
  },

  createRole: (
    name: string,
    description: string,
    permissionIds: string[]
  ): EmployeeServiceRole => {
    /*
     * Actual role creation is now handled by
     * useCreateRoleMutation() in rolesApi.ts.
     *
     * This method only exists for compatibility with
     * older code that may still import employeeService.
     */
    return {
      id: "",
      name,
      description,
      permissions: [],
      permissionIds: [...permissionIds],
    };
  },
};