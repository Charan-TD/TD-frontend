"use client";

import { useState, type ReactNode } from "react";

import { PageFooter } from "../admin/components/PageFooter";
import { SectionActions, SectionSearch } from "../admin/components/SectionActions";
import { SidePanel } from "../admin/components/SidePanel";
import { SkeletonTable } from "../admin/components/Skeleton";
import { StatusTabs } from "../admin/components/StatusTabs";
import { TransientSuccessMessage } from "../admin/components/TransientSuccessMessage";
import { errorMessage } from "../admin/views/approvalShared";
import {
  useApproveReviewReplyMutation,
  useGetReviewRepliesQuery,
  useGetReviewReplyQuery,
  useRejectReviewReplyMutation,
  type ReplyStatus,
  type ReviewReply,
} from "./api/reviewRepliesApi";

const PAGE_SIZE = 10;
const MAX_REASON = 5000;

const STATUS_LABEL: Record<ReplyStatus, { label: string; tone: string }> = {
  PENDING_APPROVAL: { label: "Pending approval", tone: "warn" },
  APPROVED: { label: "Approved", tone: "ok" },
  REJECTED: { label: "Rejected", tone: "bad" },
};

const dateOf = (value: string | null) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

export function Stars({ value, size = 12 }: { value: number | null; size?: number }) {
  if (value == null) return <span className="td-muted">—</span>;
  return (
    <span className="td-fb-stars" style={{ fontSize: size }} role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => <i key={star} className={star <= Math.round(value) ? "is-on" : undefined}>★</i>)}
    </span>
  );
}

function StatusBadge({ status }: { status: ReplyStatus }) {
  const { label, tone } = STATUS_LABEL[status];
  return <span className={`td-ord-status td-ord-status--${tone}`}>{label}</span>;
}

/** Restaurant replies to customer reviews wait here until an admin approves or rejects them. */
export function ReplyModerationView({ canModerate, headerActions }: { canModerate: boolean; headerActions?: ReactNode }) {
  const [tab, setTab] = useState<"all" | ReplyStatus>("PENDING_APPROVAL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const term = search.trim();
  const invalidRange = !!startDate && !!endDate && startDate > endDate;
  const filtered = !!term || !!startDate || !!endDate;
  const replies = useGetReviewRepliesQuery(
    { page, status: tab === "all" ? undefined : tab, search: term, startDate: startDate || undefined, endDate: endDate || undefined },
    { skip: invalidRange },
  );
  const pending = useGetReviewRepliesQuery({ page: 1, status: "PENDING_APPROVAL" });
  const rows = replies.currentData?.rows ?? [];
  const total = replies.currentData?.total ?? 0;
  const totalPages = replies.currentData?.totalPages ?? 1;
  const loading = replies.isLoading || (replies.isFetching && !replies.currentData);
  // Deciding the last reply on a page can leave that page past the end.
  if (replies.currentData && page > totalPages) setPage(totalPages);

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search restaurant, customer, order or reply" />
      {headerActions && <SectionActions>{headerActions}</SectionActions>}
      <TransientSuccessMessage message={message} />
      {replies.isError && <div className="api-state api-state--error" role="alert">Unable to load restaurant replies. {errorMessage(replies.error)}</div>}

      <div className="td-table-card">
        <div className="td-table-card-head">
          <h3>Restaurant replies</h3>
          <StatusTabs placement="inline" label="Filter replies by status" value={tab} onChange={(value) => { setTab(value as typeof tab); setPage(1); }}
            tabs={[
              { id: "PENDING_APPROVAL", label: "Pending", count: pending.data?.total },
              { id: "APPROVED", label: "Approved" },
              { id: "REJECTED", label: "Rejected" },
              { id: "all", label: "All" },
            ]} />
        </div>

        <div className="td-reply-filters">
          <label>Submitted from<input type="date" className="td-input" value={startDate} max={endDate || undefined} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} /></label>
          <label>to<input type="date" className="td-input" value={endDate} min={startDate || undefined} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} /></label>
          {(startDate || endDate) && <button type="button" className="td-view-link" onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}>Clear dates</button>}
          <button type="button" className="td-btn td-btn--small" disabled={replies.isFetching || invalidRange} onClick={() => { void replies.refetch(); void pending.refetch(); }}>{replies.isFetching ? "Refreshing..." : "Refresh"}</button>
        </div>
        {invalidRange && <div className="api-state api-state--error" role="alert">The start date must be on or before the end date.</div>}

        {loading && !replies.isError && <SkeletonTable columns={["Restaurant", "Customer", "Rating", "Reply", "Status"]} />}

        {!loading && !replies.isError && !invalidRange && (
          <>
            <div className="td-table-scroll">
              <table className="td-table">
                <thead><tr><th>Restaurant</th><th>Customer</th><th>Rating</th><th>Reply</th><th>Submitted</th><th>Status</th><th className="td-th-right">Actions</th></tr></thead>
                <tbody>
                  {rows.map((reply) => (
                    <tr key={reply.id}>
                      <td><div className="td-contact"><span>{reply.restaurantName}</span><small>{reply.restaurantId ?? ""}</small></div></td>
                      <td><div className="td-contact"><span>{reply.customerName}</span><small>{reply.orderNumber ?? ""}</small></div></td>
                      <td><Stars value={reply.rating} /></td>
                      <td className="td-muted td-gord-details" title={reply.replyText}>{reply.replyText || "—"}</td>
                      <td className="td-muted">{dateOf(reply.submittedAt)}</td>
                      <td><StatusBadge status={reply.status} /></td>
                      <td className="td-th-right">
                        <button type="button" className="td-view-link" onClick={() => setSelectedId(reply.id)} aria-label={`Review reply from ${reply.restaurantName}`}>
                          {reply.status === "PENDING_APPROVAL" ? "Review" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div className="api-state">{filtered ? "No replies match your filters." : tab === "PENDING_APPROVAL" ? "No replies are waiting for approval." : "No replies found."}</div>}
            </div>
            {total > 0 && <PageFooter page={Math.min(page, totalPages)} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} shown={rows.length} noun="replies" onChange={setPage} disabled={replies.isFetching} />}
          </>
        )}
      </div>

      {selectedId && (
        <ReplyPanel id={selectedId} summary={rows.find((row) => row.id === selectedId) ?? null} canModerate={canModerate}
          onClose={() => setSelectedId(null)} onDone={(text) => { setMessage(text); setSelectedId(null); }} />
      )}
    </section>
  );
}

function ReplyPanel({ id, summary, canModerate, onClose, onDone }: { id: string; summary: ReviewReply | null; canModerate: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const detail = useGetReviewReplyQuery(id);
  const [approve, { isLoading: approving }] = useApproveReviewReplyMutation();
  const [reject, { isLoading: rejecting }] = useRejectReviewReplyMutation();
  const [rejectingNow, setRejectingNow] = useState(false);
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const busy = approving || rejecting;
  const reply = detail.currentData ?? summary;
  const decidable = reply?.status === "PENDING_APPROVAL" && canModerate;
  const trimmed = reason.trim();

  const run = async (action: () => Promise<unknown>, success: string) => {
    setError("");
    try {
      await action();
      onDone(success);
    } catch (failure) {
      setConfirmingApprove(false);
      setError(errorMessage(failure));
    }
  };

  return (
    <SidePanel open onClose={onClose} closeDisabled={busy} eyebrow="RESTAURANT REPLY" title={reply ? reply.restaurantName : "Reply"}
      description={reply ? `${reply.customerName}${reply.orderNumber ? ` · ${reply.orderNumber}` : ""}` : undefined}
      footer={decidable ? (
        rejectingNow ? (
          <>
            <button type="button" className="td-btn td-btn--small" disabled={busy} onClick={() => { setRejectingNow(false); setReason(""); setError(""); }}>Back</button>
            <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={busy || !trimmed || trimmed.length > MAX_REASON}
              onClick={() => void run(() => reject({ id, rejection_reason: trimmed }).unwrap(), "Reply rejected. The restaurant can edit and resubmit it.")}>{rejecting ? "Rejecting..." : "Reject reply"}</button>
          </>
        ) : confirmingApprove ? (
          <>
            <button type="button" className="td-btn td-btn--small" disabled={busy} onClick={() => setConfirmingApprove(false)}>Back</button>
            <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={busy}
              onClick={() => void run(() => approve(id).unwrap(), "Reply approved and published.")}>{approving ? "Approving..." : "Confirm approval"}</button>
          </>
        ) : (
          <>
            <button type="button" className="td-btn td-btn--small" disabled={busy} onClick={() => { setError(""); setRejectingNow(true); }}>Reject</button>
            <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={busy} onClick={() => { setError(""); setConfirmingApprove(true); }}>Approve</button>
          </>
        )
      ) : <button type="button" className="td-btn td-btn--small" onClick={onClose}>Close</button>}>
      {detail.isError && <div className="api-state api-state--error" role="alert">Unable to load the details and history for this reply. {errorMessage(detail.error)}</div>}
      {!reply && !detail.isError && <div className="api-state">Loading…</div>}
      {reply && (
        <div className="td-ord-panel">
          <section>
            <h4>Customer review</h4>
            <p><Stars value={reply.rating} size={14} /></p>
            <div className="td-gord-note"><p>{reply.review || "No written review."}</p></div>
          </section>
          <section>
            <h4>Restaurant reply <StatusBadge status={reply.status} /></h4>
            <div className="td-gord-note"><small>Attempt {reply.attemptNumber}</small><p>{reply.replyText}</p></div>
            {reply.status === "REJECTED" && reply.rejectionReason && <div className="td-gord-note"><small>Rejection reason</small><p>{reply.rejectionReason}</p></div>}
          </section>
          {!canModerate && reply.status === "PENDING_APPROVAL" && <div className="api-state" role="note">You do not have permission to approve or reject replies.</div>}
          {confirmingApprove && decidable && <div className="api-state" role="note">The customer will see this reply. Once approved, it cannot be changed or rejected.</div>}
          {rejectingNow && decidable && (
            <section>
              <h4>Rejection reason</h4>
              <textarea className="td-input" rows={4} maxLength={MAX_REASON} value={reason} disabled={busy} autoFocus
                aria-label="Rejection reason" placeholder="Tell the restaurant what to change before resubmitting" onChange={(event) => setReason(event.target.value)} />
            </section>
          )}
          {error && <div className="api-state api-state--error" role="alert">{error}</div>}
          {detail.currentData && detail.currentData.history.length > 0 && (
            <section>
              <h4>History</h4>
              <ol className="td-ord-steps">
                {detail.currentData.history.map((event, index) => (
                  <li key={`${event.createdAt}-${index}`} className="is-done">
                    {event.eventType.charAt(0)}{event.eventType.slice(1).toLowerCase()} · attempt {event.attemptNumber}
                    <small>{dateOf(event.createdAt)}{event.adminName ? ` · ${event.adminName}` : ""}</small>
                    {event.rejectionReason && <small>{event.rejectionReason}</small>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </SidePanel>
  );
}
