# Frontend permission-model update

This frontend now follows the backend role model directly:

- permission records are resources (for example `employees`, `orders`, `roles`)
- operational access is stored separately as `read`, `insert`, `update`, `delete`
- role create/update payloads use `{ permissionId, actions }[]`
- the UI no longer creates resource_action permission names such as `employees_read`
- an unconfigured resource no longer defaults to full CRUD access
- role editing is initialized from `role.permission_code`
- creating an employee with a new role uses the same action matrix

Validation run: `npx tsc --noEmit` passed.
