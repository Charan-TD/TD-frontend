import Chip from "@mui/material/Chip";
import { formatStatusLabel } from "../../admin/models/formatStatusLabel";

const statusColors: Record<string, { color: string; backgroundColor: string }> = {
  PLACED: { color: "#946200", backgroundColor: "#fff6df" },
  CONFIRMED: { color: "#1d4ed8", backgroundColor: "#eff6ff" },
  PREPARING: { color: "#c2410c", backgroundColor: "#fff0e6" },
  READY: { color: "#7e22ce", backgroundColor: "#faf0ff" },
  OUT_FOR_DELIVERY: { color: "#0e7490", backgroundColor: "#ecfeff" },
  DELIVERED: { color: "#16834a", backgroundColor: "#eaf7ef" },
  CANCELLED: { color: "#c93636", backgroundColor: "#fff0ef" },
};

export function OrderStatus({ status }: { status: string }) {
  const normalized = status.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!normalized || normalized === "_") return <span>-</span>;

  return (
    <Chip
      size="small"
      label={formatStatusLabel(status)}
      sx={{
        ...(statusColors[normalized] ?? { color: "#52525b", backgroundColor: "#f4f4f5" }),
        height: "auto",
        borderRadius: 999,
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.4,
        "& .MuiChip-label": { px: 1.25, py: 0.5 },
      }}
    />
  );
}
