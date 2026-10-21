"use client";

import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LocationMap } from "../components/LocationMap";
import { RefreshButton } from "../components/RefreshButton";
import { ReviewModal } from "../components/ReviewModal";
import { SkeletonTable } from "../components/Skeleton";
import {
  useDecideRegistrationMutation,
  useGetRegistrationRequestsQuery,
  useGetRestaurantReviewQuery,
  type RegistrationRequest,
  type RegistrationStatus,
} from "../../restaurants/api/registrationRequestsApi";
import { cuisineNames, useGetCuisinesQuery } from "../../restaurants/api/cuisinesApi";
import { STATUS_FILTERS, errorMessage, formatDate, str } from "./approvalShared";

const PHOTOS: { key: string; label: string }[] = [
  { key: "logo_url", label: "Logo" },
  { key: "cover_url", label: "Cover photo" },
];

function Card({ title, rows, wide = false }: { title: string; rows: [string, ReactNode][]; wide?: boolean }) {
  return (
    <section className={`review-card${wide ? " review-card--wide" : ""}`}>
      <h4>{title}</h4>
      <dl className="review-rows">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const WEEK: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

type DayHours = {
  is_open?: boolean;
  is_24_hours?: boolean;
  slots?: { opening_time?: string; closing_time?: string }[];
};

/** "15:30" -> "3:30 PM" */
function clock(time: string | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? "");
  if (!match) return time ?? "—";
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

/**
 * Stored as { mon: { is_open, is_24_hours, slots: [{ opening_time, closing_time }] }, ... }.
 * Shown Monday to Sunday; a day can have several slots (e.g. a lunch break).
 */
function hoursRows(value: unknown): [string, ReactNode][] {
  if (!value || typeof value !== "object") return [["Hours", "—"]];
  const hours = value as Record<string, DayHours | null>;
  const rows = WEEK.filter((day) => hours[day.key]).map((day): [string, ReactNode] => {
    const entry = hours[day.key] as DayHours;
    const slots = (entry.slots ?? []).filter((slot) => slot.opening_time && slot.closing_time);
    if (entry.is_24_hours) return [day.label, "Open 24 hours"];
    if (entry.is_open === false || slots.length === 0) return [day.label, "Closed"];
    return [
      day.label,
      slots.map((slot) => `${clock(slot.opening_time)} – ${clock(slot.closing_time)}`).join(", "),
    ];
  });
  return rows.length ? rows : [["Hours", "—"]];
}

export function ReviewDetails({ restaurantId }: { restaurantId: string }) {
  const { data: r, isLoading, isError, error } = useGetRestaurantReviewQuery(restaurantId);
  const { data: cuisines = [] } = useGetCuisinesQuery();

  if (isLoading) return <div className="api-state review-card--wide">Loading restaurant details…</div>;
  if (isError || !r) {
    return (
      <div className="api-state api-state--error review-card--wide">
        Could not load details. {errorMessage(error)}
      </div>
    );
  }

  const address = [r.house_no, r.landmark, r.city, r.state, r.pincode].filter(Boolean).join(", ");
  const documents: { label: string; number: string; detail?: string; url: unknown }[] = [
    { label: "PAN card", number: str(r.pan), url: r.pan_document_url },
    { label: "GST certificate", number: str(r.gstin), url: r.gst_document_url },
    {
      label: "FSSAI licence",
      number: str(r.fssai_number),
      detail: r.fssai_valid_until ? `Valid until ${str(r.fssai_valid_until)}` : undefined,
      url: r.fssai_document_url,
    },
    { label: "Business proof", number: str(r.business_proof_document_number), url: r.business_proof_document_url },
    { label: "Aadhaar card", number: str(r.aadhaar_number), url: r.aadhaar_document_url },
    {
      label: "Bank proof",
      number: str(r.account_number),
      detail: [r.bank_name, r.ifsc].filter(Boolean).join(" · ") || undefined,
      url: r.bank_proof_url,
    },
  ];
  const photos = PHOTOS.filter((photo) => typeof r[photo.key] === "string");
  const missingCount = documents.filter((doc) => typeof doc.url !== "string").length;

  return (
    <div className="review-columns">
      <div className="review-col">
      <Card
        title="Restaurant"
        rows={[
          ["Type", str(r.restaurant_type)],
          ["Cuisines", str(cuisineNames(r.cuisines, cuisines))],
          ["Food served", str(r.food_served)],
          ["Restaurant contact", str(r.restaurant_contact)],
          ["Address", address || "—"],
        ]}
      />
      <Card
        title="Owner"
        rows={[
          ["Name", str(r.owner_name)],
          ["Mobile", str(r.owner_mobile)],
          ["Email", str(r.restaurant_email)],
          ["Aadhaar", str(r.aadhaar_number)],
        ]}
      />
      <Card
        title="Bank account"
        rows={[
          ["Account holder", str(r.account_holder_name)],
          ["Bank", str(r.bank_name)],
          ["Account number", str(r.account_number)],
          ["IFSC", str(r.ifsc)],
        ]}
      />
      <Card title="Opening hours" rows={hoursRows(r.operating_hours)} />
      </div>

      <div className="review-col">
      <section className="review-card">
        <h4>Location on map</h4>
        <LocationMap latitude={r.latitude} longitude={r.longitude} address={address} label={r.name} />
      </section>

      <section className="review-card">
        <div className="review-card__head">
          <h4>Business documents</h4>
          {missingCount > 0 ? (
            <span className="review-badge review-badge--warn">{missingCount} missing</span>
          ) : (
            <span className="review-badge review-badge--ok">All uploaded</span>
          )}
        </div>
        <ul className="doc-list">
          {documents.map((doc) => {
            const url = typeof doc.url === "string" ? doc.url : null;
            return (
              <li key={doc.label} className={`doc-item${url ? "" : " doc-item--missing"}`}>
                <span className="doc-item__icon" aria-hidden="true">
                  {url ? "✓" : "!"}
                </span>
                <div className="doc-item__info">
                  <strong>{doc.label}</strong>
                  <span className="doc-item__number">{doc.number}</span>
                  {doc.detail && <span className="doc-item__detail">{doc.detail}</span>}
                </div>
                {url ? (
                  <a className="secondary-button doc-item__view" href={url} target="_blank" rel="noopener noreferrer">
                    View document
                  </a>
                ) : (
                  <span className="review-badge review-badge--warn">Not uploaded</span>
                )}
              </li>
            );
          })}
        </ul>
        {photos.length > 0 && (
          <div className="doc-photos">
            {photos.map((photo) => (
              <a key={photo.key} href={r[photo.key] as string} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r[photo.key] as string} alt={photo.label} loading="lazy" />
                <span>{photo.label}</span>
              </a>
            ))}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

export function RegistrationApprovalsPanel() {
  const [filter, setFilter] = useState<RegistrationStatus>("pending");
  const [selected, setSelected] = useState<RegistrationRequest | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: requests = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetRegistrationRequestsQuery(filter);
  const [decide, { isLoading: deciding }] = useDecideRegistrationMutation();

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
      await decide({ requestId: selected.requestId, decision: "ACCEPTED" }).unwrap();
      closeAll();
    } catch (err) {
      setConfirmApprove(false);
      setActionError(errorMessage(err));
    }
  };

  const onReject = async () => {
    if (!selected || !reason.trim()) return;
    try {
      await decide({
        requestId: selected.requestId,
        decision: "REJECTED",
        rejection_reason: reason.trim(),
      }).unwrap();
      closeAll();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  return (
    <div className="approval-panel">
      <div className="approval-filters" role="tablist">
        {STATUS_FILTERS.map((item) => (
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

        <RefreshButton refreshing={isFetching} label="registration requests" onRefresh={() => refetch()} />
      </div>

      {isError && (
        <div className="api-state api-state--error">
          Unable to load registration requests. Server said: {errorMessage(error)}
        </div>
      )}

      {isLoading && <SkeletonTable columns={["Restaurant", "Owner", "Type", "Submitted", "Status"]} />}

      {!isLoading && !isError && requests.length === 0 && (
        <div className="api-state">No {filter} registration requests.</div>
      )}

      {!isLoading && !isError && requests.length > 0 && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>Restaurant</th>
                <th>Owner</th>
                <th>Type</th>
                <th>Submitted</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.requestId}>
                  <td>{request.restaurantName}</td>
                  <td>{request.ownerName ?? "—"}</td>
                  <td>{request.restaurantType ?? "—"}</td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>
                    <span className={`status-pill${request.status === "approved" ? " status-pill--live" : ""}`}>
                      <i />
                      {request.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action"
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
        <ReviewModal
          title={selected.restaurantName}
          subtitle={`Submitted ${formatDate(selected.createdAt)}`}
          status={selected.status}
          onClose={closeAll}
          footer={
            <>
              {actionError && <span className="review-modal__error">{actionError}</span>}
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
            </>
          }
        >
          {selected.status === "rejected" && selected.rejectionReason && (
            <div className="api-state api-state--error review-card--wide">Rejected: {selected.rejectionReason}</div>
          )}
          <ReviewDetails restaurantId={selected.restaurantId} />
        </ReviewModal>
      )}

      <ConfirmDialog
        open={confirmApprove}
        title="Approve this restaurant?"
        message={
          selected && (
            <>
              <strong>{selected.restaurantName}</strong> will become active and its owner will be able to sign in.
            </>
          )
        }
        confirmLabel="Approve"
        busyLabel="Approving…"
        busy={deciding}
        onConfirm={onApprove}
        onCancel={() => setConfirmApprove(false)}
      />

      {rejecting && selected && (
        <div className="modal-backdrop" onClick={() => !deciding && setRejecting(false)}>
          <div
            className="modal-card modal-card--pop approval-detail"
            role="dialog"
            aria-modal="true"
            aria-label="Reject registration"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Reject {selected.restaurantName}</h3>
            <label htmlFor="reject-reason">Reason (shown to the restaurant)</label>
            <textarea
              id="reject-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Submitted business documents are incomplete"
              autoFocus
            />
            {actionError && <div className="api-state api-state--error">{actionError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" disabled={deciding} onClick={() => setRejecting(false)}>
                Back
              </button>
              <button
                type="button"
                className="primary-button confirm-dialog-danger"
                disabled={deciding || !reason.trim()}
                data-tooltip={!reason.trim() ? "Enter a reason to reject" : undefined}
                onClick={onReject}
              >
                {deciding ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
