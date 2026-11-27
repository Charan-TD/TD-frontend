"use client";

import { useState } from "react";
import type { AdminProfile } from "../models/portal";
import { normalizeIndianMobile, validateIndianMobile } from "../components/PhoneInput";

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
    phone: normalizeIndianMobile(admin.phone),
    location: admin.location,
  });

  const update = (field: keyof EditableAdminProfile, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const [showErrors, setShowErrors] = useState(false);
  const phoneError = showErrors ? validateIndianMobile(form.phone) : "";

  const submit = () => {
    if (validateIndianMobile(form.phone)) return setShowErrors(true);
    onSave({ ...form, phone: normalizeIndianMobile(form.phone) });
  };

  return {
    admin,
    form,
    savedMessage,
    update,
    submit,
    phoneError,
    onBack,
  };
}
