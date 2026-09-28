"use client";

import { useState } from "react";
import type { AdminProfile } from "../models/portal";

export type EditableAdminProfile = Pick<AdminProfile, "name" | "email" | "phone" | "location">;

export function useEditProfileViewModel(
  admin: AdminProfile,
  savedMessage: string,
  onBack: () => void,
  onSave: (profile: EditableAdminProfile) => void,
) {
  const [form, setForm] = useState<EditableAdminProfile>({
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    location: admin.location,
  });

  const update = (field: keyof EditableAdminProfile, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = () => onSave(form);

  return {
    admin,
    form,
    savedMessage,
    update,
    submit,
    onBack,
  };
}
