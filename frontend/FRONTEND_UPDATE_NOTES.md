# Frontend update notes

## API server
All RTK Query endpoints use the centralized base URL:

`https://train-dhaba-backend-dev.up.railway.app/api/v1`

It is set in `.env.local` and is also the fallback in `src/features/admin/api/baseApi.ts`.

## Permission contract
The logged-in employee permissions are now treated as the backend action matrix, for example:

```json
{
  "employees": ["read", "insert", "update", "delete"],
  "roles": ["read", "insert", "update", "delete"]
}
```

The frontend no longer converts resource names into artificial `employees_read` style permissions.

## Conditional API calls
The employee/role screens now avoid calling protected supporting endpoints when the logged-in employee does not have the corresponding permission:

- `/roles` requires `roles.read`
- `/permissions` requires `permissions.read`
- `/employee-roles` metadata is only loaded when both `employee_roles.read` and `roles.read` are present

This prevents avoidable 403 responses for users who can access Employees but cannot inspect role-assignment metadata.

## Role actions
Role creation/update payloads continue to use the backend format:

```json
{
  "permissions": [
    {
      "permissionId": "<uuid>",
      "actions": ["read", "insert", "update", "delete"]
    }
  ]
}
```

## Validation
`node node_modules/typescript/bin/tsc --noEmit` passes with the updated source.

## Next.js
`package.json` targets Next.js `16.3.8` because the earlier `16.3.5` version was flagged by npm audit. Running `npm install` will refresh the lockfile to the secure version.
