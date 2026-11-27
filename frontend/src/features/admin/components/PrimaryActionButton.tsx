import Button, { type ButtonProps } from "@mui/material/Button";
import { Icon } from "./Icon";
import { colors } from "@/app/theme/tokens";

/** Shared MUI button for create/add actions in management sections. */
export function PrimaryActionButton({ className, sx, variant = "contained", ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      variant={variant}
      startIcon={<Icon name="plus" size={17} />}
      className={["button--add-action", className].filter(Boolean).join(" ")}
      sx={[{
        minHeight: 42,
        px: 1.75,
        border: `1px solid ${colors.slate}`,
        borderRadius: "9px",
        color: colors.surface,
        backgroundColor: colors.slate,
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        textTransform: "none",
        boxShadow: "none",
        whiteSpace: "nowrap",
        "&:hover": { borderColor: colors.slateHover, backgroundColor: colors.slateHover, boxShadow: "none" },
        "&.Mui-disabled": { borderColor: "#cbd0d8", color: "#858d9a", backgroundColor: "#e9ebef" },
      }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}
