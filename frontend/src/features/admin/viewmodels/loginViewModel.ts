"use client";

import { useEffect, useState } from "react";

import { useEmployeeLoginMutation } from "../api/authApi";
import { baseApi } from "../api/baseApi";
import type { EmployeeLoginData } from "../api/authApi";
import { setAuthSession } from "../authSlice";
import { store } from "../store";
import { normalizePermissionMap } from "../models/access";

/** sessionStorage flag set when the portal signs someone out because their login expired. */
export const SESSION_EXPIRED_NOTE_KEY = "train_dabba_session_expired";

export function useLoginViewModel(onSignIn: (session: EmployeeLoginData) => void) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Explains why the person is back here if their login expired. Read after
  // mounting so the server-rendered page and the browser agree.
  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_EXPIRED_NOTE_KEY)) return;
    sessionStorage.removeItem(SESSION_EXPIRED_NOTE_KEY);
    setErrorMessage("Your session has expired. Please sign in again.");
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [employeeLogin] = useEmployeeLoginMutation();

  const submit = async () => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await employeeLogin({
        email: email.trim(),
        password,
      }).unwrap();

      const normalizedPermissions = normalizePermissionMap(response.data.permissions);
      const normalizedSession = {
        ...response.data,
        permissions: normalizedPermissions,
      };

      store.dispatch(
        setAuthSession({
          employee: normalizedSession.employee,
          role: normalizedSession.role,
          permissions: normalizedPermissions,
          accessToken: normalizedSession.accessToken,
          refreshToken: normalizedSession.refreshToken,
        }),
      );

      localStorage.setItem(
        "train_dabba_access_token",
        normalizedSession.accessToken,
      );

      localStorage.setItem(
        "train_dabba_refresh_token",
        normalizedSession.refreshToken,
      );

      localStorage.setItem(
        "train_dabba_employee",
        JSON.stringify(normalizedSession.employee),
      );

      localStorage.setItem(
        "train_dabba_role",
        JSON.stringify(normalizedSession.role),
      );

      localStorage.setItem(
        "train_dabba_permissions",
        JSON.stringify(normalizedPermissions),
      );

      // Reset RTK Query cache to clear any leftover `isError` states from previous failed sessions
      store.dispatch(baseApi.util.resetApiState());

      onSignIn(normalizedSession);
    } catch (error: any) {
      setErrorMessage(
        error?.data?.message ||
        error?.data?.error ||
        "Invalid email or password",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    passwordVisible,
    errorMessage,
    isSubmitting,
    setEmail,
    setPassword,
    togglePasswordVisibility: () =>
      setPasswordVisible((value) => !value),
    submit,
  };
}