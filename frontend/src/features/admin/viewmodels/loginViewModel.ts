"use client";

import { useState } from "react";

export function useLoginViewModel(onSignIn: () => void) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState("udaySir@traindabba.in");
  const [password, setPassword] = useState("admin123");

  const submit = () => {
    if (!email || !password) return;
    onSignIn();
  };

  return {
    email,
    password,
    passwordVisible,
    setEmail,
    setPassword,
    togglePasswordVisibility: () => setPasswordVisible((value) => !value),
    submit,
  };
}
