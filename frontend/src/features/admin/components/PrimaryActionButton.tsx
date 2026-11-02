import Button, { type ButtonProps } from "@mui/material/Button";
import { Icon } from "./Icon";

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
        border: "1px solid #1e293b",
        borderRadius: "9px",
        color: "#fff",
        backgroundColor: "#1e293b",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        textTransform: "none",
        boxShadow: "none",
        whiteSpace: "nowrap",
        "&:hover": { borderColor: "#29364a", backgroundColor: "#29364a", boxShadow: "none" },
        "&.Mui-disabled": { borderColor: "#cbd0d8", color: "#858d9a", backgroundColor: "#e9ebef" },
      }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}
