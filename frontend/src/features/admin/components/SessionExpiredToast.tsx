"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useEffect, useState } from "react";

import { SESSION_EXPIRED_EVENT } from "../api/baseApi";

/**
 * Shown when the API rejects a request with 401. The person is not signed out automatically (token
 * refresh isn't available on the backend yet), so they are told to sign out and back in themselves.
 */
export function SessionExpiredToast() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(SESSION_EXPIRED_EVENT, show);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, show);
  }, []);

  return (
    <Snackbar open={open} autoHideDuration={10000} onClose={(_, reason) => { if (reason !== "clickaway") setOpen(false); }} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
      <Alert severity="error" variant="filled" role="alert" onClose={() => setOpen(false)} sx={{ fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}>
        Invalid token. Please log out and log in again.
      </Alert>
    </Snackbar>
  );
}
