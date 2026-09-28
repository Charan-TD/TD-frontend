"use client";

import { useState } from "react";

type Props = { name?: string | null; imageUrl?: string | null; size?: "small" | "medium" | "large" };

function backgroundFor(value: string) {
  const palette = ["#fff1e3", "#e8f5ed", "#f2ebff", "#fff5cf", "#e9f0ff", "#fce9e9"];
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function UserAvatar({ name, imageUrl, size = "medium" }: Props) {
  const [failed, setFailed] = useState(false);
  const safeName = name?.trim() || "User";
  const initial = safeName.charAt(0).toUpperCase();
  const showImage = Boolean(imageUrl?.trim()) && !failed;
  return showImage ? <img className={`avatar avatar--${size}`} src={imageUrl!} alt={`${safeName} profile`} onError={() => setFailed(true)} /> : <span className={`avatar avatar--${size} avatar--fallback`} style={{ background: backgroundFor(safeName) }} aria-label={`${safeName} avatar`}>{initial}</span>;
}
