import Button, { type ButtonProps } from "@mui/material/Button";

export function SoftGreenButton({ className, sx, variant = "contained", ...props }: ButtonProps) {
  return (
    <Button
      {...props}
      variant={variant}
      className={["button--soft-green", className].filter(Boolean).join(" ")}
      sx={[{
        minHeight: 40,
        px: 1.75,
        border: "1px solid #cfe3d7",
        borderRadius: "9px",
        color: "#246b4e",
        backgroundColor: "#eaf4ee",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 600,
        textTransform: "none",
        boxShadow: "none",
        "&:hover": { borderColor: "#b9d8c6", color: "#195a40", backgroundColor: "#dcece2", boxShadow: "none" },
      }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    />
  );
}
