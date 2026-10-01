"use client";

import { useState } from "react";

import { useEmployeeLoginMutation } from "../api/authApi";
import { baseApi } from "../api/baseApi";
import type { EmployeeLoginData } from "../api/authApi";
import { setAuthSession } from "../authSlice";
import { store } from "../store";

export function useLoginViewModel(onSignIn: (session: EmployeeLoginData) => void) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState("udaySir@traindabba.in");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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

      store.dispatch(
        setAuthSession({
          employee: response.data.employee,
          role: response.data.role,
          permissions: response.data.permissions,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        }),
      );

      localStorage.setItem(
        "train_dabba_access_token",
        response.data.accessToken,
      );

      localStorage.setItem(
        "train_dabba_refresh_token",
        response.data.refreshToken,
      );

      localStorage.setItem(
        "train_dabba_employee",
        JSON.stringify(response.data.employee),
      );

      localStorage.setItem(
        "train_dabba_role",
        JSON.stringify(response.data.role),
      );

      localStorage.setItem(
        "train_dabba_permissions",
        JSON.stringify(response.data.permissions),
      );

      // Reset RTK Query cache to clear any leftover `isError` states from previous failed sessions
      store.dispatch(baseApi.util.resetApiState());

      onSignIn(response.data);
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