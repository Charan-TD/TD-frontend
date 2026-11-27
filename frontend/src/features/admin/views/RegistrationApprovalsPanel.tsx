"use client";

import { Icon } from "../components/Icon";
import { useState, type ReactNode } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SoftGreenButton } from "../components/SoftGreenButton";
import { LocationMap } from "../components/LocationMap";
import { InitialsAvatar } from "../components/InitialsAvatar";
import { PageFooter } from "../components/PageFooter";
import { ReviewModal } from "../components/ReviewModal";
import { SkeletonTable } from "../components/Skeleton";
import { formatStatusLabel } from "../models/formatStatusLabel";
import {
  useDecideRegistrationMutation,
  useGetRegistrationRequestsQuery,
  useGetRestaurantReviewQuery,
  type RegistrationRequest,
  type RegistrationStatus,
  type RestaurantReview,
} from "../../restaurants/api/registrationRequestsApi";
import { publicRestaurantId } from "../../restaurants/api/restaurantId";
import { cuisineNames, useGetCuisinesQuery } from "../../restaurants/api/cuisinesApi";
import { errorMessage, formatDate, ridersOwnerLabel, str } from "./approvalShared";

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

export const WEEK: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export type DayHours = {
  is_open?: boolean;
  is_24_hours?: boolean;
  slots?: { opening_time?: string; closing_time?: string }[];
};

/** "15:30" -> "3:30 PM" */
export function clock(time: string | undefined): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? "");
  if (!match) return time ?? "-";
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

/**
 * Stored as { mon: { is_open, is_24_hours, slots: [{ opening_time, closing_time }] }, ... }.
 * Shown Monday to Sunday; a day can have several slots (e.g. a lunch break).
 */
function hoursRows(value: unknown): [string, ReactNode][] {
  if (!value || typeof value !== "object") return [["Hours", "-"]];
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
  return rows.length ? rows : [["Hours", "-"]];
}

export function ReviewDetails({
  restaurantId,
  fallback = null,
}: {
  restaurantId: string;
  /** Restaurant record from the registration list, used when there is no public ID to fetch with. */
  fallback?: RestaurantReview | null;
}) {
  const hasPublicId = publicRestaurantId(restaurantId) !== null;
  const query = useGetRestaurantReviewQuery(restaurantId, { skip: !hasPublicId && !!fallback });
  const { isLoading, isError, error } = query;
  const r = hasPublicId || !fallback ? query.data : fallback;
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
  // The list response carries storage keys (*_document_id) but no signed links; those only
  // come from GET /restaurants/{publicId}. A document counts as uploaded if either exists.
  const documentIds: Record<string, unknown> = {
    "PAN card": r.pan_document_id,
    "GST certificate": r.gst_document_id,
    "FSSAI licence": r.fssai_document_id,
    "Business proof": r.business_proof_document_id,
    "Aadhaar card": r.aadhaar_document_id,
    "Bank proof": r.bank_proof_id,
  };
  const isUploaded = (doc: { label: string; url: unknown }) =>
    typeof doc.url === "string" || (typeof documentIds[doc.label] === "string" && !!documentIds[doc.label]);
  const missingCount = documents.filter((doc) => !isUploaded(doc)).length;

  return (
    <div className="review-columns">
      <div className="review-col">
      <Card
        title="Restaurant"
        rows={[
          ["Type", str(r.restaurant_type)],
          ["Delivery riders", ridersOwnerLabel(r.riders_owner)],
          ["Cuisines", str(cuisineNames(r.cuisines, cuisines))],
          ["Food served", str(r.food_served)],
          ["Restaurant contact", str(r.restaurant_contact)],
          ["Address", address || "-"],
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
              <li key={doc.label} className={`doc-item${isUploaded(doc) ? "" : " doc-item--missing"}`}>
                <span className="doc-item__icon" aria-hidden="true">
                  {isUploaded(doc) ? "✓" : "!"}
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
                ) : isUploaded(doc) ? (
                  <span className="review-badge review-badge--ok">Uploaded · link unavailable</span>
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
                { }
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

const PAGE_SIZE = 10;

/** A field from the restaurant record embedded in the registration request. */
const recordText = (request: RegistrationRequest, key: string): string | null => {
  const value = request.restaurantRecord?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const shortDate = (value: string | null | undefined) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "-";
};

/** FSSAI, GST and bank proof: uploaded if the record has a signed link or a stored document key. */
const documentChips = (request: RegistrationRequest) => {
  const has = (...keys: string[]) => keys.some((key) => !!request.restaurantRecord?.[key]);
  return [
    { label: "FSSAI", ok: has("fssai_document_id", "fssai_document_url") },
    { label: "GST", ok: has("gst_document_id", "gst_document_url") },
    { label: "Bank", ok: has("bank_proof_id", "bank_proof_url") },
  ];
};

export function RegistrationApprovalsPanel({ filter, search }: { filter: RegistrationStatus; search: string }) {
  const [page, setPage] = useState(1);
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
      await decide({ requestId: selected.requestId, phone: recordText(selected, "owner_mobile"), decision: "ACCEPTED" }).unwrap();
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
        phone: recordText(selected, "owner_mobile"),
        decision: "REJECTED",
        rejection_reason: reason.trim(),
      }).unwrap();
      closeAll();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const term = search.trim().toLowerCase();
  const matching = requests.filter((r) => !term || [r.restaurantName, r.ownerName, recordText(r, "owner_mobile"), recordText(r, "restaurant_contact")].some((v) => String(v ?? "").toLowerCase().includes(term)));
  const totalPages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = matching.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Changing tab or search starts again from the first page.
  const [resetKey, setResetKey] = useState(`${filter}|${search}`);
  if (resetKey !== `${filter}|${search}`) {
    setResetKey(`${filter}|${search}`);
    setPage(1);
    closeAll();
  }

  const open = (request: RegistrationRequest, action?: "approve" | "reject") => {
    setActionError(null);
    setSelected(request);
    if (action === "approve") setConfirmApprove(true);
    if (action === "reject") setRejecting(true);
  };

  return (
    <div className="approval-panel">
      {isError && (
        <div className="api-state api-state--error">
          Unable to load registration requests. Server said: {errorMessage(error)}
          <button type="button" className="td-outline-btn" onClick={() => refetch()} disabled={isFetching}>Retry</button>
        </div>
      )}

      {isLoading && <SkeletonTable columns={["Restaurant", "Owner", "Phone", "Documents"]} />}

      {!isLoading && !isError && matching.length === 0 && (
        <div className="api-state">{term ? `No applications match "${search.trim()}".` : `No ${filter} applications.`}</div>
      )}

      {!isLoading && !isError && matching.length > 0 && (
        <>
          <div className="td-approval-grid">
            {visible.map((request) => {
              const docs = documentChips(request);
              return (
                <article key={request.requestId} className="td-approval-card">
                  <header>
                    <InitialsAvatar name={request.restaurantName} imageUrl={request.logoUrl} size={36} />
                    <span>
                      <button type="button" className="td-approval-name" onClick={() => open(request)}>{request.restaurantName}</button>
                      <small>{[request.restaurantType ? formatStatusLabel(request.restaurantType) : null, `Submitted ${shortDate(request.createdAt)}`].filter(Boolean).join(" · ")}</small>
                    </span>
                  </header>
                  <dl>
                    <div><dt>Owner</dt><dd>{request.ownerName ?? "-"}</dd></div>
                    <div><dt>Phone</dt><dd>{recordText(request, "owner_mobile") ?? recordText(request, "restaurant_contact") ?? "-"}</dd></div>
                    <div><dt>Documents</dt><dd className="td-doc-chips">{docs.map((d) => <i key={d.label} className={d.ok ? "is-ok" : "is-missing"}>{d.ok ? "✓" : "!"} {d.label}</i>)}</dd></div>
                  </dl>
                  <footer>
                    {request.status === "pending" && <button type="button" className="td-btn td-btn--small td-btn--reject" onClick={() => open(request, "reject")}>Reject</button>}
                    <button type="button" className="td-view-link" onClick={() => open(request)}>View</button>
                    {request.status === "pending" && <button type="button" className="td-btn td-btn--small td-btn--approve" onClick={() => open(request, "approve")}>Approve</button>}
                  </footer>
                </article>
              );
            })}
          </div>
          <PageFooter page={current} totalPages={totalPages} total={matching.length} pageSize={PAGE_SIZE} shown={visible.length} noun="applications" onChange={setPage} />
        </>
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
                  <SoftGreenButton onClick={() => setConfirmApprove(true)}>
                    Approve
                  </SoftGreenButton>
                </>
              )}
            </>
          }
        >
          {selected.status === "rejected" && selected.rejectionReason && (
            <div className="api-state api-state--error review-card--wide">Rejected: {selected.rejectionReason}</div>
          )}
          {selected.ridersOwner && (
            <div className={`riders-banner riders-banner--${selected.ridersOwner.toLowerCase() === "traindhaba" ? "platform" : "own"} review-card--wide`}>
              <span className="riders-banner__icon"><Icon name="rider" size={18} /></span>
              <div>
                <strong>{ridersOwnerLabel(selected.ridersOwner)}</strong>
                <span>{selected.ridersOwner.toLowerCase() === "traindhaba" ? "Requested riders from Train Dhaba for this restaurant's orders." : "This restaurant will deliver its orders with its own riders."}</span>
              </div>
            </div>
          )}
          <ReviewDetails restaurantId={selected.restaurantId} fallback={selected.restaurantRecord} />
        </ReviewModal>
      )}

      <ConfirmDialog
        open={confirmApprove}
        title="Approve this restaurant?"
        message={
          selected && (
            <>
              <strong>{selected.restaurantName}</strong> will become active and its owner will be able to sign in.{selected.ridersOwner && <><br />Delivery: <strong>{ridersOwnerLabel(selected.ridersOwner)}</strong></>}
            </>
          )
        }
        confirmLabel="Approve"
        confirmButtonTone="soft-green"
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
