"use client";

import { useState } from "react";

const TONES = ["orange", "blue", "green", "purple", "red"] as const;

const initialsOf = (name: string) => {
  const words = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

/** A soft-coloured rounded square with the person's initials; the colour is stable per name. */
export function InitialsAvatar({ name, imageUrl, size = 32 }: { name?: string | null; imageUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const safe = name?.trim() || "User";
  const tone = TONES[[...safe].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) };
  if (imageUrl?.trim() && !failed) {
    return <img className="td-avatar" style={style} src={imageUrl} alt={`${safe} profile`} onError={() => setFailed(true)} />;
  }
  return <span className={`td-avatar td-avatar--${tone}`} style={style} aria-label={`${safe} avatar`}>{initialsOf(safe)}</span>;
}
