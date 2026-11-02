"use client";

import { Icon } from "../../admin/components/Icon";
import { SectionActions } from "../../admin/components/SectionActions";
import { ComingSoonPanel } from "../../admin/components/ComingSoonPanel";

/**
 * Placeholder for "which employee performed which administrative action".
 * No audit log exists in the backend yet, so this stays a simple, honest
 * placeholder instead of inventing activity data.
 */
export function EmployeeActivityView({ onBack }: { onBack: () => void }) {
  return (
    <section className="employee-workspace">
      <SectionActions><button className="back-link" type="button" onClick={onBack}>
        <Icon name="arrow-left" size={15} /> Back to staff list
      </button></SectionActions>
      <ComingSoonPanel
        eyebrow="EMPLOYEE ACTIVITY"
        title="Employee activity log"
        description="A record of which employee performed which administrative action — approvals, edits, deletions — will appear here once activity logging is added to the backend."
      />
    </section>
  );
}
