"use client";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Icon } from "./Icon";

type RefreshButtonProps = {
  onRefresh: () => void;
  refreshing: boolean;
  /** Names what is reloaded, for the tooltip while a refresh is already running. */
  label?: string;
};

/** Shared MUI refresh button used throughout list and review screens. */
export function RefreshButton({ onRefresh, refreshing, label = "this list" }: RefreshButtonProps) {
  return (
    <Button
      className="secondary-button approval-refresh"
      variant="outlined"
      onClick={onRefresh}
      disabled={refreshing}
      title={refreshing ? `Already refreshing ${label}` : undefined}
      startIcon={refreshing ? <CircularProgress size={14} color="inherit" /> : <Icon name="refresh" size={14} />}
      sx={{
        flex: "0 0 auto",
        minWidth: 0,
        minHeight: 42,
        px: 1.75,
        borderColor: "#dfe4eb",
        borderRadius: "9px",
        color: "#243148",
        backgroundColor: "#fff",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.2,
        textTransform: "none",
        boxShadow: "none",
        whiteSpace: "nowrap",
        "&:hover": { borderColor: "#c8d0dc", backgroundColor: "#f8fafc", boxShadow: "none" },
        "& .MuiButton-startIcon": { mr: 0.75, ml: 0 },
      }}
    >
      {refreshing ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
