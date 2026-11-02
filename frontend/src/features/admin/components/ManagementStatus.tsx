import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { formatStatusLabel } from "../models/formatStatusLabel";

function statusTone(status: string | null | undefined): "positive" | "negative" | "pending" {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (["active", "approved", "open", "delivered", "completed", "successful"].includes(normalized)) return "positive";
  if (["inactive", "blocked", "rejected", "cancelled", "canceled", "closed", "failed"].includes(normalized)) return "negative";
  return "pending";
}

const tones = {
  positive: { color: "#16834a", background: "#eaf7ef" },
  negative: { color: "#c93636", background: "#fff0ef" },
  pending: { color: "#946200", background: "#fff6df" },
};

export function ManagementStatus({ status }: { status: string | null | undefined }) {
  if (!status?.trim()) return <span>-</span>;

  const tone = statusTone(status);
  return (
    <Chip
      className={`management-status management-status--${tone}`}
      size="small"
      label={formatStatusLabel(status)}
      icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "currentColor" }} />}
      sx={{
        height: "auto",
        borderRadius: 999,
        color: tones[tone].color,
        backgroundColor: tones[tone].background,
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.25,
        "& .MuiChip-label": { px: 1.1, py: 0.35 },
        "& .MuiChip-icon": { ml: 1, mr: -0.2, color: "inherit" },
      }}
    />
  );
}
