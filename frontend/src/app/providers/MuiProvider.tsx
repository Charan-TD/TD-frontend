"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { colors, legacyOranges } from "../theme/tokens";

const theme = createTheme({
  palette: {
    primary: {
      main: legacyOranges.muiPrimary,
      dark: legacyOranges.muiPrimaryDark,
      light: legacyOranges.muiPrimaryLight,
    },
    success: { main: colors.success, light: colors.successWash },
    error: { main: colors.danger, light: colors.dangerWash },
    text: { primary: colors.ink, secondary: colors.muted },
    divider: colors.line,
  },
  // 10px is not on the radius scale (6/8/12/16); kept to avoid a visual change.
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "Barlow, system-ui, sans-serif",
    button: { fontSize: "14px", fontWeight: 600, textTransform: "none" },
  },
});

export function MuiProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
