"use client";

import { useState } from "react";

export function useLoginViewModel(onSignIn: () => void) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState("udaySir@traindabba.in");

  const submit = () => onSignIn();

  return {
    email,
    passwordVisible,
    setEmail,
    togglePasswordVisibility: () => setPasswordVisible((value) => !value),
    submit,
  };
}
