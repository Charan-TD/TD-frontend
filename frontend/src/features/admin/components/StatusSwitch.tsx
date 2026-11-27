"use client";

/** On/off switch with its state written beside it ("On" / "Off", "Active" / "Blocked"). */
export function StatusSwitch({ checked, onChange, disabled = false, onLabel = "On", offLabel = "Off", label, tooltip, tooltipKind }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
  /** Accessible name, e.g. "Status of Priya". */
  label: string;
  tooltip?: string;
  tooltipKind?: "access";
}) {
  return (
    <span className={`td-switch-wrap${checked ? " is-on" : ""}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className="td-switch"
        disabled={disabled}
        data-tooltip={tooltip}
        data-tooltip-kind={tooltipKind}
        onClick={(event) => { event.stopPropagation(); onChange(!checked); }}
      ><i /></button>
      <span className="td-switch-label">{checked ? onLabel : offLabel}</span>
    </span>
  );
}
