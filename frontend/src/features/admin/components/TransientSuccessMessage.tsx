"use client";

import Alert from "@mui/material/Alert";
import { useEffect, useState } from "react";

export function TransientSuccessMessage({
  message,
  className = "success-banner",
}: {
  message?: string | null;
  className?: string;
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timeoutId = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  if (!message || !visible) return null;

  return (
    <Alert
      className={className}
      severity="success"
      role="status"
      aria-live="polite"
      sx={{
        alignItems: "center",
        my: 1.5,
        py: 0.25,
        borderRadius: "10px",
        color: "#176b43",
        backgroundColor: "#eaf7ef",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        "& .MuiAlert-icon": { color: "#16834a", py: 0.5 },
        "& .MuiAlert-message": { py: 0.75 },
      }}
    >
      {message}
    </Alert>
  );
}
