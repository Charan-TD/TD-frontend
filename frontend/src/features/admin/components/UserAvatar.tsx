"use client";

import { useState } from "react";

type Props = { name?: string | null; imageUrl?: string | null; size?: "small" | "medium" | "large" };

export function UserAvatar({ name, imageUrl, size = "medium" }: Props) {
  const [failed, setFailed] = useState(false);
  const safeName = name?.trim() || "User";
  const initial = safeName.charAt(0).toUpperCase();
  const showImage = Boolean(imageUrl?.trim()) && !failed;
  return showImage ? <img className={`avatar avatar--${size}`} src={imageUrl!} alt={`${safeName} profile`} onError={() => setFailed(true)} /> : <span className={`avatar avatar--${size} avatar--fallback`} aria-label={`${safeName} avatar`}>{initial}</span>;
}
