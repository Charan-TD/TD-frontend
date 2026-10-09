"use client";

import { useState } from "react";

import { useForgotEmployeePasswordMutation } from "../api/authApi";

/** Asks the backend to email password-reset instructions to the employee. */
export function useForgotPasswordViewModel(initialEmail: string) {
  const [email, setEmail] = useState(initialEmail);
  const [errorMessage, setErrorMessage] = useState("");
  const [sentMessage, setSentMessage] = useState("");

  const [forgotPassword, { isLoading }] = useForgotEmployeePasswordMutation();

  const submit = async () => {
    setErrorMessage("");

    try {
      const response = await forgotPassword({ email: email.trim() }).unwrap();
      setSentMessage(response.message);
    } catch (error) {
      const data = (error as { data?: { message?: string } } | undefined)?.data;
      setErrorMessage(data?.message || "Could not send the reset email. Please try again.");
    }
  };

  return {
    email,
    errorMessage,
    sentMessage,
    isSubmitting: isLoading,
    setEmail,
    submit,
  };
}
