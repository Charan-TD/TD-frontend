"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Tells viewers whether a card shows real data from the API ("Live") or
 * placeholder numbers that will be connected later ("Sample").
 * Remove the "sample" badge from a card once its API is connected.
 */
export function DataSourceBadge({ kind }: { kind: "live" | "sample" }) {
  if (kind === "live") {
    return (
      <span
        className="data-badge data-badge--live"
        data-tooltip="Real data, loaded from the system"
        data-tooltip-icon="check"
      >
        <i aria-hidden="true" />
        Live
      </span>
    );
  }

  return (
    <span
      className="data-badge data-badge--sample"
      data-tooltip="Sample numbers for preview. Real data will appear here in an upcoming update."
      data-tooltip-icon="sparkle"
    >
      Sample
    </span>
  );
}

/** Banner explaining the Live / Sample badges, shown above preview content. */
export function SampleDataNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="sample-data-notice" role="note">
      <span className="sample-data-notice__icon" aria-hidden="true">
        <Icon name="sparkle" size={16} />
      </span>
      <div>
        <strong>Preview: some figures are sample data</strong>
        <p>
          {children ?? (
            <>
              Cards marked <DataSourceBadge kind="sample" /> show placeholder numbers so you can
              see the layout. They&apos;ll switch to real data in upcoming updates. Cards marked{" "}
              <DataSourceBadge kind="live" /> are already real.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
