import type { AdminProfile } from "../models/portal";

/**
 * Signed-out placeholder. It deliberately carries NO name and NO access:
 * the real profile always comes from the authenticated employee (login
 * response or /auth/employee/me). Previously this was a hard-coded
 * "Uday Sir" super-admin with every section, which is what every other
 * employee briefly (or, after a logout, persistently) inherited.
 */
const guestAdmin: AdminProfile = {
  name: "",
  email: "",
  phone: "",
  location: "",
  role: "",
  access: [],
  permissions: {},
};

export const adminPortalService = {
  getAdmin: () => ({ ...guestAdmin, access: [], permissions: {} }),
};
