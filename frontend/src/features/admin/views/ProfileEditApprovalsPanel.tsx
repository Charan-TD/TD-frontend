"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LocationMap } from "../components/LocationMap";
import { RefreshButton } from "../components/RefreshButton";
import { ReviewModal } from "../components/ReviewModal";
import { SkeletonTable } from "../components/Skeleton";
import { useGetRestaurantsQuery } from "../../restaurants/api/restaurantsApi";
import {
  useGetRegistrationRequestsQuery,
  useGetRestaurantReviewQuery,
} from "../../restaurants/api/registrationRequestsApi";
import {
  useApproveProfileEditMutation,
  useGetProfileEditRequestsQuery,
  useRejectProfileEditMutation,
  type ProfileEditRequest,
  type ProfileEditStatus,
} from "../../restaurants/api/profileEditRequestsApi";
import { STATUS_FILTERS, errorMessage, formatDate, str } from "./approvalShared";

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
  pan_number: "PAN number",
  aadhaar_number: "Aadhaar number",
  pan_card: "PAN document",
  adhaar_card: "Aadhaar document",
  gst_document: "GST document",
};

const DOCUMENT_FIELDS = new Set(["pan_card", "adhaar_card", "gst_document"]);

const labelFor = (key: string) =>
  FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const isUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value);

function Value({ field, value }: { field: string; value: unknown }) {
  if (isUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer">
        View
      </a>
    );
  }
  if (DOCUMENT_FIELDS.has(field)) return <>{value ? "Uploaded file" : "—"}</>;
  return <>{str(value)}</>;
}

const LOCATION_FIELDS = ["house_no", "landmark", "city", "state", "pincode", "lat", "lon"];

const shortId = (request: ProfileEditRequest) => `Restaurant ${request.restaurantId.slice(0, 8)}`;

/** A name stored on the request itself (previous values), if the backend included one. */
function nameFromRequest(request: ProfileEditRequest): string | null {
  for (const key of ["name", "rest_name", "restaurant_name"]) {
    const value = request.previousValues[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

/**
 * The restaurants list can miss a restaurant (it is paged and filtered), so when
 * the name is not already known, load that one restaurant by its id.
 */
function RestaurantName({ request, knownName }: { request: ProfileEditRequest; knownName: string | null }) {
  const { data } = useGetRestaurantReviewQuery(request.restaurantId, { skip: !!knownName || !request.restaurantId });
  return <>{knownName ?? data?.name ?? shortId(request)}</>;
}

export function ProfileEditApprovalsPanel() {
  const [filter, setFilter] = useState<ProfileEditStatus>("pending");
  const [selected, setSelected] = useState<ProfileEditRequest | null>(null);
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
  } = useGetProfileEditRequestsQuery(filter);
  const { data: restaurants = [], refetch: refetchRestaurants } = useGetRestaurantsQuery();
  // Registration requests carry each restaurant's name with its id, and cover restaurants
  // the restaurants list may leave out.
  const registrations = [
    useGetRegistrationRequestsQuery("pending"),
    useGetRegistrationRequestsQuery("approved"),
    useGetRegistrationRequestsQuery("rejected"),
  ];
  const [approve, { isLoading: approving }] = useApproveProfileEditMutation();
  const [reject, { isLoading: rejectingNow }] = useRejectProfileEditMutation();

  // The request rows carry only a restaurant id, so look the name up.
  const pending = registrations[0].data;
  const approved = registrations[1].data;
  const rejected = registrations[2].data;
  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of [pending, approved, rejected]) {
      for (const request of list ?? []) {
        if (request.restaurantId && request.restaurantName !== "Unnamed restaurant") {
          map.set(request.restaurantId, request.restaurantName);
        }
      }
    }
    for (const restaurant of restaurants) map.set(restaurant.id, restaurant.name);
    return map;
  }, [pending, approved, rejected, restaurants]);
  const knownNameOf = (request: ProfileEditRequest) =>
    names.get(request.restaurantId) ?? nameFromRequest(request);

  // The open request also needs its name in titles and messages.
  const hasLocationChange = !!selected && LOCATION_FIELDS.some((key) => key in selected.requestedChanges);
  const { data: selectedRestaurant } = useGetRestaurantReviewQuery(selected?.restaurantId ?? "", {
    skip: !selected || (!!knownNameOf(selected) && !hasLocationChange),
  });
  const nameOf = (request: ProfileEditRequest) =>
    knownNameOf(request) ?? (selected?.id === request.id ? selectedRestaurant?.name : undefined) ?? shortId(request);

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
    } catch (err) {
      setConfirmApprove(false);
      setActionError(errorMessage(err));
    }
  };

  const onReject = async () => {
    if (!selected || !reason.trim()) return;
    try {
      await reject({ id: selected.id, rejection_reason: reason.trim() }).unwrap();
      closeAll();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const changes = selected ? Object.entries(selected.requestedChanges) : [];

  // The requested address: changed fields from the request, the rest from the restaurant as it is now.
  const addressFrom = (read: (key: string, live: unknown) => unknown) => {
    const r = selectedRestaurant;
    return [
      read("house_no", r?.house_no),
      read("landmark", r?.landmark),
      read("city", r?.city),
      read("state", r?.state),
      read("pincode", r?.pincode),
    ]
      .map((value) => (value == null ? "" : String(value).trim()))
      .filter(Boolean)
      .join(", ");
  };
  // Current: what the restaurant has now (the request's stored previous values win, as the live
  // record may already carry the change). Requested: changed fields from the request.
  const currentAddress = selected
    ? addressFrom((key, live) => (key in selected.previousValues ? selected.previousValues[key] : live))
    : "";
  const requestedAddress = selected
    ? addressFrom((key, live) => (key in selected.requestedChanges ? selected.requestedChanges[key] : live))
    : "";
  const coords = (source: Record<string, unknown> | undefined, live?: Record<string, unknown>) => {
    const lat = source?.lat ?? live?.lat ?? live?.latitude;
    const lon = source?.lon ?? live?.lon ?? live?.longitude;
    return lat != null && lon != null ? { lat, lon } : { lat: null, lon: null };
  };
  const currentCoords = selected ? coords(selected.previousValues, selectedRestaurant) : coords(undefined);
  const requestedCoords = selected
    ? selected.requestedChanges.lat != null && selected.requestedChanges.lon != null
      ? { lat: selected.requestedChanges.lat, lon: selected.requestedChanges.lon }
      : { lat: null, lon: null }
    : { lat: null, lon: null };
  // Location fields are compared on the maps below, so the table lists the other changes only.
  const otherChanges = changes.filter(([field]) => !LOCATION_FIELDS.includes(field));

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

        <RefreshButton
          refreshing={isFetching}
          label="profile edit requests"
          onRefresh={() => {
            refetch();
            refetchRestaurants();
            registrations.forEach((query) => query.refetch());
          }}
        />
      </div>

      {isError && (
        <div className="api-state api-state--error">
          Unable to load profile edit requests. Server said: {errorMessage(error)}
        </div>
      )}

      {isLoading && <SkeletonTable columns={["Restaurant", "Submitted", "Changes", "Status"]} />}

      {!isLoading && !isError && requests.length === 0 && (
        <div className="api-state">No {filter} profile edit requests.</div>
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
                  <td>
                    <RestaurantName request={request} knownName={knownNameOf(request)} />
                  </td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td>{Object.keys(request.requestedChanges).map(labelFor).join(", ") || "—"}</td>
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
          title={nameOf(selected)}
          subtitle={`Profile edit requested ${formatDate(selected.createdAt)}`}
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
          {hasLocationChange && (
            <section className="review-card review-card--wide">
              <h4>Location change</h4>
              <div className="location-compare">
                <div>
                  <p className="location-compare__title">Current location</p>
                  <p className="location-compare__address">{currentAddress || "—"}</p>
                  <LocationMap
                    latitude={currentCoords.lat}
                    longitude={currentCoords.lon}
                    address={currentAddress}
                    label={`${nameOf(selected)} (current)`}
                  />
                </div>
                <div>
                  <p className="location-compare__title">Requested location</p>
                  <p className="location-compare__address">{requestedAddress || "—"}</p>
                  <LocationMap
                    latitude={requestedCoords.lat}
                    longitude={requestedCoords.lon}
                    address={requestedAddress}
                    label={`${nameOf(selected)} (requested)`}
                  />
                </div>
              </div>
            </section>
          )}
          {otherChanges.length > 0 && (
          <section className="review-card review-card--wide">
            <h4>Requested changes</h4>
            <div className="approval-compare">
              <div className="approval-compare-head">
                <span>Field</span>
                <span>Current</span>
                <span>Requested</span>
              </div>
              {otherChanges.map(([field, value]) => (
                <div className="approval-compare-row" key={field}>
                  <span>{labelFor(field)}</span>
                  <span>
                    <Value field={field} value={selected.previousValues[field]} />
                  </span>
                  <strong>
                    <Value field={field} value={value} />
                  </strong>
                </div>
              ))}
            </div>
          </section>
          )}
          {changes.length === 0 && (
            <div className="api-state review-card--wide">No change details were returned.</div>
          )}
        </ReviewModal>
      )}

      <ConfirmDialog
        open={confirmApprove}
        title="Approve these changes?"
        message={
          selected && (
            <>
              The requested changes will be applied to <strong>{nameOf(selected)}</strong>.
            </>
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
            aria-label="Reject profile changes"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Reject changes for {nameOf(selected)}</h3>
            <label htmlFor="reject-edit-reason">Reason (shown to the restaurant)</label>
            <textarea
              id="reject-edit-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. PAN document does not match owner details"
              autoFocus
            />
            {actionError && <div className="api-state api-state--error">{actionError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" disabled={rejectingNow} onClick={() => setRejecting(false)}>
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
    </div>
  );
}
