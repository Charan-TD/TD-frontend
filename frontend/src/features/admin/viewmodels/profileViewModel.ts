import type { AdminProfile } from "../models/portal";

export function useProfileViewModel(admin: AdminProfile, onEdit: () => void) {
  return {
    admin,
    onEdit,
  };
}
