import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { Icon } from "./Icon";

export type ManagementAction = "view" | "block" | "unblock" | "activate" | "deactivate" | "edit" | "review" | "restore" | "remove";

const actionIcon: Record<ManagementAction, "info" | "toggle-check" | "toggle-slash" | "edit" | "file" | "check" | "trash"> = {
  view: "info",
  block: "toggle-slash",
  unblock: "toggle-check",
  activate: "toggle-check",
  deactivate: "toggle-slash",
  edit: "edit",
  review: "file",
  restore: "check",
  remove: "trash",
};

export function ManagementActionButton({
  action,
  onClick,
  ariaLabel,
  disabled = false,
  tooltip,
  tooltipKind,
  className = "",
  stateIndicator,
}: {
  action: ManagementAction;
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  tooltip?: string;
  tooltipKind?: "access";
  className?: string;
  stateIndicator?: "active" | "blocked";
}) {
  const actionLabel = action[0].toUpperCase() + action.slice(1);
  const actionTone = stateIndicator
    ? stateIndicator === "active" ? "positive" : "negative"
    : action === "activate" || action === "unblock"
      ? "positive"
      : action === "deactivate" || action === "block"
        ? "negative"
        : undefined;
  const icon = stateIndicator === "active"
    ? "toggle-check"
    : stateIndicator === "blocked"
      ? "toggle-slash"
      : actionIcon[action];
  const color = actionTone === "positive" ? "#16834a" : actionTone === "negative" ? "#cf4141" : "#202b3d";
  const isToggleAction = action === "activate" || action === "deactivate" || action === "block" || action === "unblock";

  return (
    <Tooltip title={tooltip ?? actionLabel} placement="top" enterDelay={250}>
      <span>
        <IconButton
          type="button"
          className={`table-action table-icon-action table-icon-action--${action}${actionTone ? ` table-icon-action--${actionTone}` : ""}${stateIndicator ? ` table-icon-action--state-${stateIndicator}` : ""} ${className}`.trim()}
          onClick={(event) => { event.stopPropagation(); onClick(); }}
          aria-label={ariaLabel}
          disabled={disabled}
          data-tooltip-kind={tooltipKind}
          disableRipple
          sx={{
            width: isToggleAction ? 40 : 32,
            minWidth: isToggleAction ? 40 : 32,
            height: isToggleAction ? 40 : 32,
            p: isToggleAction ? 0.5 : 0.625,
            borderRadius: "8px",
            color,
            backgroundColor: "transparent",
            boxShadow: "none",
            transition: "background-color .14s ease, transform .14s ease, color .14s ease",
            "&:hover": { color, backgroundColor: "transparent", transform: "translateY(-1px)" },
            "&.Mui-disabled": { opacity: 0.48, color, backgroundColor: "transparent" },
          }}
        >
          <Icon name={icon} size={isToggleAction ? 34 : 20} />
        </IconButton>
      </span>
    </Tooltip>
  );
}
