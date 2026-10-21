"use client";

import { useState } from "react";
import { useGetRegistrationRequestsQuery } from "../../restaurants/api/registrationRequestsApi";
import { useGetProfileEditRequestsQuery } from "../../restaurants/api/profileEditRequestsApi";
import { RegistrationApprovalsPanel } from "./RegistrationApprovalsPanel";
import { ProfileEditApprovalsPanel } from "./ProfileEditApprovalsPanel";

type Kind = "registrations" | "profile-edits";

export function RestaurantApprovalsView() {
  const [kind, setKind] = useState<Kind>("registrations");

  // Same arguments as the panels use, so these share their cached results.
  const pendingRegistrations = useGetRegistrationRequestsQuery("pending");
  const pendingEdits = useGetProfileEditRequestsQuery("pending");

  const tabs: { id: Kind; label: string; count: number | undefined }[] = [
    { id: "registrations", label: "New registrations", count: pendingRegistrations.data?.length },
    { id: "profile-edits", label: "Profile edits", count: pendingEdits.data?.length },
  ];

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          <span className="eyebrow">APPROVALS</span>
          <h2>Restaurant Approvals</h2>
          <p>
            {kind === "registrations"
              ? "Review newly registered restaurants, check their documents, then approve or reject."
              : "Review changes existing restaurants have asked to make to their profile."}
          </p>
        </div>
      </header>

      <div className="approval-kind" role="tablist" aria-label="Approval type">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={kind === tab.id}
            className={kind === tab.id ? "is-selected" : ""}
            onClick={() => setKind(tab.id)}
          >
            {tab.label}
            {tab.count ? <b>{tab.count}</b> : null}
          </button>
        ))}
      </div>

      {kind === "registrations" ? <RegistrationApprovalsPanel /> : <ProfileEditApprovalsPanel />}
    </section>
  );
}
