"use client";

import { useState } from "react";

type Props = { name?: string | null; imageUrl?: string | null; size?: "small" | "medium" | "large" };

export function UserAvatar({ name, imageUrl, size = "medium" }: Props) {
  const [failed, setFailed] = useState(false);
  const safeName = name?.trim() || "User";
  const initial = safeName.charAt(0).toUpperCase();
  const showImage = Boolean(imageUrl?.trim()) && !failed;
  const avatarColors = ["#ff6255", "#2196f3", "#8247f5", "#00a84f", "#f4b400", "#08b6a7", "#f33369"];
  const colorIndex = [...safeName].reduce((value, character) => value + character.charCodeAt(0), 0) % avatarColors.length;
  return showImage ? <img className={`avatar avatar--${size}`} src={imageUrl!} alt={`${safeName} profile`} onError={() => setFailed(true)} /> : <span className={`avatar avatar--${size} avatar--fallback`} style={{ background: avatarColors[colorIndex] }} aria-label={`${safeName} avatar`}>{initial}</span>;
}
