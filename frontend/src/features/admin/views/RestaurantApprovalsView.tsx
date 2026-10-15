"use client";

import { useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SkeletonTable } from "../components/Skeleton";
import {
  useApproveProfileRequestMutation,
  useGetProfileRequestsQuery,
  useRejectProfileRequestMutation,
  type ProfileRequest,
  type ProfileRequestStatus,
} from "../../restaurants/api/profileRequestsApi";

const FILTERS: { id: ProfileRequestStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const FIELD_LABELS: Record<string, string> = {
  rest_name: "Restaurant name",
  owner_name: "Owner name",
  restaurant_type: "Type",
  lat: "Latitude",
  lon: "Longitude",
  city: "City",
  state: "State",
  pincode: "Pincode",
  landmark: "Landmark",
  house_no: "House no.",
  gst: "GST number",
  gst_document: "GST document",
  pan_number: "PAN number",
  pan_card: "PAN document",
  aadhaar_number: "Aadhaar number",
  adhaar_card: "Aadhaar document",
};

const labelFor = (key: string) =>
  FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const isUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value);

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

function ChangeValue({ value }: { value: unknown }) {
  if (isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        View document
      </a>
    );
  }
  if (value && typeof value === "object") return <>{JSON.stringify(value)}</>;
  return <>{String(value ?? "—")}</>;
}

function errorMessage(error: unknown): string {
  const data = (error as { data?: { message?: string } })?.data;
  return data?.message ?? "Something went wrong. Please try again.";
}

export function RestaurantApprovalsView() {
  const [filter, setFilter] = useState<ProfileRequestStatus>("pending");
  const [selected, setSelected] = useState<ProfileRequest | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: requests = [], isLoading, isError } = useGetProfileRequestsQuery({ status: filter });
  const [approve, { isLoading: approving }] = useApproveProfileRequestMutation();
  const [reject, { isLoading: rejectingNow }] = useRejectProfileRequestMutation();

  const closeAll = () => {
    setSelected(null);
    setConfirmApprove(false);
    setRejecting(false);
    setReason("");
    setActionError(null);
  };

  const onApprove = async () => {
    if (!selected) return;
    try {
      await approve(selected.id).unwrap();
      closeAll();
    } catch (error) {
      setConfirmApprove(false);
      setActionError(errorMessage(error));
    }
  };

  const onReject = async () => {
    if (!selected || !reason.trim()) return;
    try {
      await reject({ id: selected.id, rejection_reason: reason.trim() }).unwrap();
      closeAll();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const changes = selected ? Object.entries(selected.requestedChanges) : [];

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          <span className="eyebrow">APPROVALS</span>
          <h2>Restaurant Approvals</h2>
          <p>Review the documents and details restaurants submit, then approve or reject them.</p>
        </div>
      </header>

      <div className="approval-filters" role="tablist">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            className={filter === item.id ? "primary-button" : "secondary-button"}
            onClick={() => {
              setFilter(item.id);
              closeAll();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="api-state api-state--error">
          Unable to load requests. Check the API connection and your permissions, then try again.
        </div>
      )}

      {isLoading && <SkeletonTable columns={["Restaurant", "Submitted", "Changes", "Status"]} />}

      {!isLoading && !isError && requests.length === 0 && (
        <div className="api-state">No {filter} requests.</div>
      )}

      {!isLoading && !isError && requests.length > 0 && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Submitted</th>
                <th>Changes</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.restaurantName}</td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>{Object.keys(request.requestedChanges).length} fields</td>
                  <td>
                    <span className={`status-pill${request.status === "approved" ? " status-pill--live" : ""}`}>
                      <i />
                      {request.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setActionError(null);
                        setSelected(request);
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && !confirmApprove && !rejecting && (
        <div className="modal-backdrop" onClick={closeAll}>
          <div
            className="modal-card modal-card--pop approval-detail"
            role="dialog"
            aria-modal="true"
            aria-label={`Review ${selected.restaurantName}`}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{selected.restaurantName}</h3>
            <p>Submitted {formatDate(selected.createdAt)}</p>

            <dl className="approval-changes">
              {changes.length === 0 && <dd>No change details were returned.</dd>}
              {changes.map(([key, value]) => (
                <div key={key}>
                  <dt>{labelFor(key)}</dt>
                  <dd>
                    <ChangeValue value={value} />
                  </dd>
                </div>
              ))}
            </dl>

            {selected.status === "rejected" && selected.rejectionReason && (
              <div className="api-state api-state--error">Rejected: {selected.rejectionReason}</div>
            )}
            {actionError && <div className="api-state api-state--error">{actionError}</div>}

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeAll}>
                Close
              </button>
              {selected.status === "pending" && (
                <>
                  <button type="button" className="secondary-button" onClick={() => setRejecting(true)}>
                    Reject
                  </button>
                  <button type="button" className="primary-button" onClick={() => setConfirmApprove(true)}>
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmApprove}
        title="Approve this request?"
        message={
          selected && (
            <>The requested changes will be applied to <strong>{selected.restaurantName}</strong>.</>
          )
        }
        confirmLabel="Approve"
        busyLabel="Approving…"
        busy={approving}
        onConfirm={onApprove}
        onCancel={() => setConfirmApprove(false)}
      />

      {rejecting && selected && (
        <div className="modal-backdrop" onClick={() => !rejectingNow && setRejecting(false)}>
          <div
            className="modal-card modal-card--pop approval-detail"
            role="dialog"
            aria-modal="true"
            aria-label="Reject request"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Reject {selected.restaurantName}</h3>
            <label htmlFor="reject-reason">Reason (shown to the restaurant)</label>
            <textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. PAN document does not match owner details"
              autoFocus
            />
            {actionError && <div className="api-state api-state--error">{actionError}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={rejectingNow}
                onClick={() => setRejecting(false)}
              >
                Back
              </button>
              <button
                type="button"
                className="primary-button confirm-dialog-danger"
                disabled={rejectingNow || !reason.trim()}
                data-tooltip={!reason.trim() ? "Enter a reason to reject" : undefined}
                onClick={onReject}
              >
                {rejectingNow ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
