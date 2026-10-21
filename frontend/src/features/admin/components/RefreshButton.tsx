"use client";

type RefreshButtonProps = {
  onRefresh: () => void;
  refreshing: boolean;
  /** Names what is reloaded, for the tooltip while a refresh is already running. */
  label?: string;
};

/** Reloads a screen's data from the API; spins while the request is running. */
export function RefreshButton({ onRefresh, refreshing, label = "this list" }: RefreshButtonProps) {
  return (
    <button
      type="button"
      className="secondary-button approval-refresh"
      onClick={onRefresh}
      disabled={refreshing}
      data-tooltip={refreshing ? `Already refreshing ${label}` : undefined}
    >
      <span className={refreshing ? "approval-refresh__icon is-spinning" : "approval-refresh__icon"} aria-hidden="true">
        ↻
      </span>
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  );
}
