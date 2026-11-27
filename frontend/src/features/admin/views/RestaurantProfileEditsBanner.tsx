"use client";

import { useState } from "react";

import {
  useApproveProfileEditMutation,
  useGetProfileEditRequestsQuery,
  useRejectProfileEditMutation,
} from "../../restaurants/api/profileEditRequestsApi";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Icon } from "../components/Icon";
import { errorMessage } from "./approvalShared";
import { Value, labelFor } from "./ProfileEditApprovalsPanel";

const when = (value: string | null) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

/**
 * Shows the restaurant's pending profile-edit request on its Details tab. The API approves or
 * rejects a request as a whole, so only "Approve all" / "Reject all" act; the per-field buttons
 * are shown disabled.
 */
export function RestaurantProfileEditsBanner({ restaurantIds, ownerName }: { restaurantIds: string[]; ownerName: string | null }) {
  const { data: pending = [] } = useGetProfileEditRequestsQuery("pending");
  const [approve, { isLoading: approving }] = useApproveProfileEditMutation();
  const [reject, { isLoading: rejecting }] = useRejectProfileEditMutation();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const ids = restaurantIds.map((id) => id.toLowerCase());
  const request = pending.find((item) => ids.includes(item.restaurantId.toLowerCase()));
  if (!request) return null;

  const changes = Object.entries(request.requestedChanges);
  const submitted = when(request.createdAt);

  const onApprove = async () => {
    try {
      await approve(request.id).unwrap();
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      setError(errorMessage(err));
    }
  };

  const onReject = async () => {
    if (!reason.trim()) return;
    try {
      await reject({ id: request.id, rejection_reason: reason.trim() }).unwrap();
      setRejectOpen(false);
      setReason("");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="td-rd-edits">
      <div className="td-rd-edits-head">
        <button type="button" className="td-rd-edits-toggle" aria-expanded={open} aria-label={open ? "Hide changes" : "Show changes"} onClick={() => setOpen(!open)}>
          <span className={open ? "is-open" : undefined}><Icon name="chevron-down" size={14} /></span>
        </button>
        <div>
          <b>Owner changed {changes.length} detail{changes.length === 1 ? "" : "s"} · waiting for your approval</b>
          <small>{[ownerName && `Requested by ${ownerName}`, submitted && `on ${submitted}`].filter(Boolean).join(" ")}{ownerName || submitted ? ". " : ""}Customers keep seeing the current details until you approve.</small>
        </div>
        <div className="td-rd-edits-actions">
          <button type="button" className="td-outline-btn" disabled={approving || rejecting} onClick={() => { setError(null); setRejectOpen(true); }}>Reject all</button>
          <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={approving || rejecting} onClick={() => { setError(null); setConfirming(true); }}>Approve all</button>
        </div>
      </div>
      {error && !rejectOpen && <div className="api-state api-state--error" role="alert">{error}</div>}

      {open && (
        <div className="td-table-scroll">
          <table className="td-table td-rd-edits-table">
            <thead><tr><th>Field</th><th>Current</th><th>New</th><th className="td-th-right">Action</th></tr></thead>
            <tbody>
              {changes.map(([field, value]) => (
                <tr key={field}>
                  <td>{labelFor(field)}</td>
                  <td className="td-muted"><Value field={field} value={request.previousValues[field]} /></td>
                  <td><strong><Value field={field} value={value} /></strong></td>
                  <td className="td-th-right">
                    <span className="td-rd-edits-row" data-tooltip="Changes are approved or rejected together for now.">
                      <button type="button" className="td-outline-btn td-outline-btn--danger" disabled>Reject</button>
                      <button type="button" className="td-outline-btn" disabled>Approve</button>
                    </span>
                  </td>
                </tr>
              ))}
              {!changes.length && <tr><td colSpan={4} className="td-muted">No change details were returned.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        title="Approve these changes?"
        message="All the requested changes will be applied to this restaurant."
        confirmLabel="Approve all"
        confirmButtonTone="soft-green"
        busyLabel="Approving…"
        busy={approving}
        onConfirm={onApprove}
        onCancel={() => setConfirming(false)}
      />

      {rejectOpen && (
        <div className="modal-backdrop" onClick={() => !rejecting && setRejectOpen(false)}>
          <div className="modal-card modal-card--pop approval-detail" role="dialog" aria-modal="true" aria-label="Reject profile changes" onClick={(event) => event.stopPropagation()}>
            <h3>Reject all changes?</h3>
            <label htmlFor="reject-edits-reason">Reason (shown to the restaurant)</label>
            <textarea id="reject-edits-reason" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. PAN document does not match owner details" autoFocus />
            {error && <div className="api-state api-state--error">{error}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" disabled={rejecting} onClick={() => setRejectOpen(false)}>Back</button>
              <button type="button" className="primary-button confirm-dialog-danger" disabled={rejecting || !reason.trim()} data-tooltip={!reason.trim() ? "Enter a reason to reject" : undefined} onClick={onReject}>{rejecting ? "Rejecting…" : "Reject all"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
