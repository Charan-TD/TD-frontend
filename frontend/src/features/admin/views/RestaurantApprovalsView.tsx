"use client";

import { useState } from "react";
import { useGetRegistrationRequestsQuery, type RegistrationStatus } from "../../restaurants/api/registrationRequestsApi";
import { useGetProfileEditRequestsQuery } from "../../restaurants/api/profileEditRequestsApi";
import { useGetReviewRepliesQuery } from "../../feedback/api/reviewRepliesApi";
import { ReplyModerationView } from "../../feedback/ReplyModerationView";
import { SectionActions, SectionSearch } from "../components/SectionActions";
import { StatusTabs } from "../components/StatusTabs";
import { RegistrationApprovalsPanel } from "./RegistrationApprovalsPanel";
import { ProfileEditApprovalsPanel } from "./ProfileEditApprovalsPanel";

type Kind = "registrations" | "profile-edits" | "review-replies";

export function RestaurantApprovalsView({ canModerateReplies }: { canModerateReplies: boolean }) {
  const [kind, setKind] = useState<Kind>("registrations");
  const [filter, setFilter] = useState<RegistrationStatus>("pending");
  const [search, setSearch] = useState("");

  // Same arguments as the panel uses, so these share its cached results.
  const pending = useGetRegistrationRequestsQuery("pending");
  const approved = useGetRegistrationRequestsQuery("approved");
  const rejected = useGetRegistrationRequestsQuery("rejected");
  const pendingEdits = useGetProfileEditRequestsQuery("pending");
  const pendingReplies = useGetReviewRepliesQuery({ page: 1, status: "PENDING_APPROVAL" });

  const typeTabs = (
    <StatusTabs placement="inline" label="Approval type" value={kind} onChange={(value) => setKind(value as Kind)}
      tabs={[
        { id: "registrations", label: "New registrations" },
        { id: "profile-edits", label: "Profile edits", count: pendingEdits.data?.length },
        { id: "review-replies", label: "Review replies", count: pendingReplies.data?.total },
      ]} />
  );

  // The replies queue is paged and searched by the server, so it brings its own search box and table.
  if (kind === "review-replies") return <ReplyModerationView canModerate={canModerateReplies} headerActions={typeTabs} />;

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={setSearch} placeholder="Search applications by restaurant, owner or phone" />
      <SectionActions>{typeTabs}</SectionActions>

      <div className="td-table-card">
        <div className="td-table-card-head">
          <h3>{kind === "registrations" ? "Approvals" : "Profile edit requests"}</h3>
          {kind === "registrations" && (
            <StatusTabs placement="inline" label="Filter applications by status" value={filter} onChange={(value) => setFilter(value as RegistrationStatus)}
              tabs={[
                { id: "pending", label: "Pending", count: pending.data?.length },
                { id: "approved", label: "Approved", count: approved.data?.length },
                { id: "rejected", label: "Rejected", count: rejected.data?.length },
              ]} />
          )}
        </div>
        <div className="td-approval-body">
          {kind === "registrations" ? <RegistrationApprovalsPanel filter={filter} search={search} /> : <ProfileEditApprovalsPanel />}
        </div>
      </div>
    </section>
  );
}
