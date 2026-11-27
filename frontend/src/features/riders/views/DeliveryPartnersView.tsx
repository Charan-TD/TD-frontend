"use client";

import { PartnerApprovalsView } from "./PartnerApprovalsView";
import { PartnersListView } from "./PartnersListView";

export function DeliveryPartnersView({ subsection, onSelectSubsection }: { subsection: string; onSelectSubsection: (subsection: string) => void }) {
  if (subsection === "riders-approvals") return <PartnerApprovalsView />;
  const handlers = subsection === "riders-handlers";
  return <PartnersListView key={handlers ? "handler" : "rider"} kind={handlers ? "handler" : "rider"} onReview={() => onSelectSubsection("riders-approvals")} />;
}
