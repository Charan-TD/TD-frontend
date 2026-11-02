"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";

const theme = createTheme({
  palette: {
    primary: { main: "#ff5a0a", dark: "#e84e00", light: "#fff1e8" },
    success: { main: "#16834a", light: "#eaf7ef" },
    error: { main: "#cf4141", light: "#fff0ef" },
    text: { primary: "#202b3d", secondary: "#647089" },
    divider: "#dfe4eb",
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"DM Sans", Arial, sans-serif',
    button: { fontSize: "14px", fontWeight: 600, textTransform: "none" },
  },
});

export function MuiProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
