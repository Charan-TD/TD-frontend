"use client";

import { useEffect, useMemo, useState } from "react";

import { Icon } from "../../admin/components/Icon";
import { ManagementActionButton } from "../../admin/components/ManagementActionButton";
import { ManagementStatus } from "../../admin/components/ManagementStatus";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { ListToolbar } from "../../admin/components/ListToolbar";
import { RefreshButton } from "../../admin/components/RefreshButton";
import { ListPagination } from "../../admin/components/ListPagination";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { PrimaryActionButton } from "../../admin/components/PrimaryActionButton";
import { SectionActions } from "../../admin/components/SectionActions";
import { SoftGreenButton } from "../../admin/components/SoftGreenButton";
import { SidePanel } from "../../admin/components/SidePanel";
import { RequiredFieldMark } from "../../admin/components/RequiredFieldMark";
import { SkeletonTable } from "../../admin/components/Skeleton";
import { UserAvatar } from "../../admin/components/UserAvatar";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { formatStatusLabel } from "../../admin/models/formatStatusLabel";
import { StationLocationPicker, type PickedLocation } from "../components/StationLocationPicker";
import { useGetAllOrdersQuery } from "../../orders/api/ordersApi";
import {
  useCreateStationMutation,
  useGetAllStationsQuery,
  useUpdateStationMutation,
  type Station,
  type StationInput,
} from "../api/stationsApi";

type Props = {
  /** One of stations-all or stations-performance. */
  subsection: string;
  canInsert: boolean;
  canUpdate: boolean;
};

export function StationsView({ subsection, canInsert, canUpdate }: Props) {
  const stationsQuery = useGetAllStationsQuery();

  if (subsection === "stations-performance") {
    return <StationPerformance query={stationsQuery} />;
  }

  return (
    <StationList
      query={stationsQuery}
      canInsert={canInsert}
      canUpdate={canUpdate}
    />
  );
}

type StationsQuery = {
  data?: Station[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => unknown;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const NAME_MAX = 255;
const CODE_MAX = 20;
const PLACE_MAX = 100;

type FormValues = {
  name: string;
  code: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  status: "active" | "inactive";
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const emptyForm: FormValues = { name: "", code: "", city: "", state: "", latitude: "", longitude: "", status: "active" };

const toForm = (station: Station): FormValues => ({
  name: station.name ?? "",
  code: station.code ?? "",
  city: station.city ?? "",
  state: station.state ?? "",
  latitude: station.latitude == null ? "" : String(station.latitude),
  longitude: station.longitude == null ? "" : String(station.longitude),
  status: isStationActive(station) ? "active" : "inactive",
});

type StationFilter = "all" | "active" | "inactive";

/** `status` is true for active stations. Older servers omit it, so a station counts as active unless it is false. */
const isStationActive = (station: Station) => station.status !== false;

const requiredText = (value: string, label: string, max: number) => {
  const text = value.trim();
  if (!text) return `${label} is required`;
  if (text.length > max) return `${label} must not exceed ${max} characters`;
  return undefined;
};

const optionalCoordinate = (value: string, label: string, min: number, max: number) => {
  if (!value.trim()) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number)) return `${label} must be a valid number`;
  if (number < min || number > max) return `${label} must be between ${min} and ${max}`;
  return undefined;
};

/** Same rules as the backend validators, so people see problems before saving. */
const validate = (values: FormValues): FormErrors => {
  const errors: FormErrors = {
    name: requiredText(values.name, "Station name", NAME_MAX),
    code: requiredText(values.code, "Station code", CODE_MAX),
    city: requiredText(values.city, "City", PLACE_MAX),
    state: requiredText(values.state, "State", PLACE_MAX),
    latitude: optionalCoordinate(values.latitude, "Latitude", -90, 90),
    longitude: optionalCoordinate(values.longitude, "Longitude", -180, 180),
  };
  (Object.keys(errors) as Array<keyof FormValues>).forEach((key) => {
    if (!errors[key]) delete errors[key];
  });
  return errors;
};

const errorText = (error: unknown, fallback: string): string => {
  const data = (error as { data?: { message?: string } } | undefined)?.data;
  return data?.message || fallback;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ------------------------------------------------------------------ */
/* All Stations / Active Stations                                      */
/* ------------------------------------------------------------------ */

function StationList({
  query,
  canInsert,
  canUpdate,
}: {
  query: StationsQuery;
  canInsert: boolean;
  canUpdate: boolean;
}) {
  const { data: stations = [], isLoading, isFetching, isError, refetch } = query;

  const [createStation, { isLoading: isCreating }] = useCreateStationMutation();
  const [updateStation, { isLoading: isUpdating }] = useUpdateStationMutation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StationFilter>("all");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const saving = isCreating || isUpdating;
  const errors = validate(values);
  const hasErrors = Object.keys(errors).length > 0;

  const activeStations = stations.filter(isStationActive);
  const inactiveStations = stations.filter((station) => !isStationActive(station));
  const inView = statusFilter === "active"
    ? activeStations
    : statusFilter === "inactive"
      ? inactiveStations
      : stations;

  const term = search.trim().toLowerCase();
  const matching = term
    ? inView.filter((station) =>
        [station.name, station.code, station.city, station.state].some((value) =>
          String(value ?? "").toLowerCase().includes(term),
        ),
      )
    : inView;
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const pagedStations = matching.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [search, statusFilter]);

  const changes = useMemo(() => {
    if (!editing) return {};
    const original = toForm(editing);
    const diff: Partial<StationInput> = {};
    if (values.name.trim() !== original.name) diff.name = values.name.trim();
    if (values.code.trim().toUpperCase() !== original.code.toUpperCase()) diff.code = values.code.trim().toUpperCase();
    if (values.city.trim() !== original.city) diff.city = values.city.trim();
    if (values.state.trim() !== original.state) diff.state = values.state.trim();
    // The API can set coordinates but not clear them, so an emptied box is ignored.
    if (values.latitude.trim() && Number(values.latitude) !== Number(original.latitude)) diff.latitude = Number(values.latitude);
    if (values.longitude.trim() && Number(values.longitude) !== Number(original.longitude)) diff.longitude = Number(values.longitude);
    if (values.status !== original.status) diff.status = values.status === "active";
    return diff;
  }, [editing, values]);

  const openAdd = () => {
    setEditing(null);
    setValues(emptyForm);
    setShowErrors(false);
    setFormError("");
    setPanelOpen(true);
  };

  const openEdit = (station: Station) => {
    setEditing(station);
    setValues(toForm(station));
    setShowErrors(false);
    setFormError("");
    setPanelOpen(true);
  };

  const closePanel = () => {
    if (saving) return;
    setPanelOpen(false);
  };

  const setField = (field: keyof FormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: field === "code" ? value.toUpperCase() : value }));

  // Coordinates stay in the form state only; the admin just sees the map and address.
  const applyLocation = (location: PickedLocation) =>
    setValues((current) => ({
      ...current,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      city: location.city || current.city,
      state: location.state || current.state,
    }));

  const saveBlocked = disabledReason(
    [saving, `Saving the station\u2026`],
    [Boolean(editing) && Object.keys(changes).length === 0, "Change a field to save"],
  );

  const submit = async () => {
    setShowErrors(true);
    setFormError("");
    if (hasErrors) return;

    const payload: StationInput = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      city: values.city.trim(),
      state: values.state.trim(),
      ...(values.latitude.trim() ? { latitude: Number(values.latitude) } : {}),
      ...(values.longitude.trim() ? { longitude: Number(values.longitude) } : {}),
    };

    try {
      if (editing) {
        await updateStation({ id: editing.id, changes }).unwrap();
        setSavedMessage(`${payload.name} was updated.`);
      } else {
        const created = await createStation(payload).unwrap();
        // The create call has no status field: stations start active, so an inactive one is switched off after.
        if (values.status === "inactive") {
          await updateStation({ id: created.id, changes: { status: false } }).unwrap();
        }
        setSavedMessage(`${payload.name} was added.`);
      }
      setPanelOpen(false);
    } catch (error) {
      setFormError(errorText(error, "The station could not be saved. Try again."));
    }
  };

  const toggleStatus = async (station: Station) => {
    const activate = !isStationActive(station);
    setActionError("");
    setSavedMessage("");
    setTogglingId(station.id);
    try {
      await updateStation({ id: station.id, changes: { status: activate } }).unwrap();
      setSavedMessage(`${station.name} is now ${activate ? "active" : "inactive"}.`);
    } catch (error) {
      setActionError(errorText(error, "The station status could not be changed."));
    } finally {
      setTogglingId(null);
    }
  };

  const columns = ["Station", "Code", "City", "State", "Status", "Added", "Action"];


  return (
    <section className="user-management-workspace">
      <header className="employee-directory-header station-directory-header">
        <StatusTabs
          label="Filter stations by status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StationFilter)}
          tabs={[
            { id: "all", label: "All Stations", count: stations.length },
            { id: "active", label: "Active", count: activeStations.length },
            { id: "inactive", label: "Inactive / Blocked", count: inactiveStations.length },
          ]}
        />
        <SectionActions>
          <PrimaryActionButton
            type="button"
            onClick={openAdd}
            disabled={!canInsert}
            data-tooltip={canInsert ? undefined : noAccess("add stations")}
            data-tooltip-kind="access"
          >
            Add station
          </PrimaryActionButton>
        </SectionActions>
      </header>

      <TransientSuccessMessage message={savedMessage} />
      {actionError && <div className="api-state api-state--error">{actionError}</div>}

      <ListToolbar value={search} onChange={setSearch} placeholder="Search by station, code, city or state" label="the stations" refreshing={isFetching} onRefresh={() => refetch()} />

      {isError && (
        <div className="api-state api-state--error">
          Unable to load stations. Check the API connection and try again.
        </div>
      )}

      {isLoading && !isError && <SkeletonTable columns={columns} />}

      {!isLoading && !isError && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pagedStations.map((station) => (
                <tr key={station.id}>
                  <td>
                    <div className="restaurant-cell">
                      <UserAvatar name={station.name} size="medium" />
                      <div>
                        <strong>{station.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{station.code ?? "-"}</td>
                  <td>{station.city ?? "-"}</td>
                  <td>{station.state ?? "-"}</td>
                  <td>
                    <span className={`status-pill ${isStationActive(station) ? "status-pill--live" : ""}`}>
                      <i />
                      {isStationActive(station) ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>{formatDate(station.created_at)}</td>
                  <td>
                        <ManagementActionButton
                          action="edit"
                          ariaLabel={`Edit ${station.name}`}
                          onClick={() => openEdit(station)}
                          disabled={!canUpdate}
                          tooltip={!canUpdate ? noAccess("edit stations") : undefined}
                          tooltipKind={!canUpdate ? "access" : undefined}
                        />
                        <ManagementActionButton
                          action={isStationActive(station) ? "deactivate" : "activate"}
                          stateIndicator={isStationActive(station) ? "active" : "blocked"}
                          ariaLabel={`${isStationActive(station) ? "Deactivate" : "Activate"} ${station.name}`}
                          onClick={() => toggleStatus(station)}
                          disabled={!canUpdate || togglingId === station.id}
                          tooltip={!canUpdate ? noAccess("change station status") : togglingId === station.id ? "Please wait, the station is being updated" : undefined}
                          tooltipKind={!canUpdate ? "access" : undefined}
                        />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!matching.length && (
            <div className="api-state">
              {inView.length ? `No stations match "${search.trim()}".` : "No stations in this status."}
            </div>
          )}
        </div>
      )}

      {!isLoading && !isError && matching.length > 0 && <ListPagination page={page} count={totalPages} onChange={setPage} disabled={isFetching} />}

      <SidePanel
        open={panelOpen}
        onClose={closePanel}
        eyebrow="STATION"
        title={editing ? "Edit station" : "Add station"}
        description={editing ? "Update the station details." : "Create a new railway station."}
        closeDisabled={saving}
      >
        <div className="form-grid">
          <label>
            <span>Station name<RequiredFieldMark /></span>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="e.g. Secunderabad Junction"
              maxLength={NAME_MAX}
              disabled={saving}
              required
            />
            {showErrors && errors.name && <small className="field-error" role="alert">{errors.name}</small>}
          </label>

          <label>
            <span>Station code<RequiredFieldMark /></span>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              placeholder="e.g. SC"
              maxLength={CODE_MAX}
              disabled={saving}
              required
            />
            {showErrors && errors.code ? (
              <small className="field-error" role="alert">{errors.code}</small>
            ) : (
              <small>Saved in capitals. Each code must be unique.</small>
            )}
          </label>

          <label>
            <span>City<RequiredFieldMark /></span>
            <input
              value={values.city}
              onChange={(event) => setField("city", event.target.value)}
              placeholder="e.g. Hyderabad"
              maxLength={PLACE_MAX}
              disabled={saving}
              required
            />
            {showErrors && errors.city && <small className="field-error" role="alert">{errors.city}</small>}
          </label>

          <label>
            <span>State<RequiredFieldMark /></span>
            <input
              value={values.state}
              onChange={(event) => setField("state", event.target.value)}
              placeholder="e.g. Telangana"
              maxLength={PLACE_MAX}
              disabled={saving}
              required
            />
            {showErrors && errors.state && <small className="field-error" role="alert">{errors.state}</small>}
          </label>

          <label>
            <span>Status</span>
            <select
              value={values.status}
              onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as FormValues["status"] }))}
              disabled={saving}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <small>Inactive stations are hidden from customers.</small>
          </label>

          <div className="station-picker-slot">
            <StationLocationPicker
              latitude={values.latitude}
              longitude={values.longitude}
              onChange={applyLocation}
              disabled={saving}
            />
          </div>
        </div>

        {formError && <div className="api-state api-state--error">{formError}</div>}

        <div className="assign-role-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={closePanel}
            disabled={saving}
            data-tooltip={saving ? "Please wait, the station is being saved" : undefined}
          >
            Cancel
          </button>

          {editing ? <SoftGreenButton
            type="button"
            onClick={submit}
            disabled={Boolean(saveBlocked)}
            data-tooltip={saveBlocked}
          >
            {saving ? "Saving\u2026" : "Save changes"}
          </SoftGreenButton> : <PrimaryActionButton
            type="button"
            onClick={submit}
            disabled={Boolean(saveBlocked)}
            data-tooltip={saveBlocked}
          >
            {saving ? "Saving\u2026" : "Add station"}
          </PrimaryActionButton>}
        </div>
      </SidePanel>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Station Performance                                                 */
/* ------------------------------------------------------------------ */

const IN_PROGRESS = ["PENDING_PAYMENT", "PLACED", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment",
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const rupees = (value: number) => `\u20B9${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

/** Performance of one station: pick a station, see its orders and how they are going. */
function StationPerformance({ query }: { query: StationsQuery }) {
  const { data: stations = [], isLoading, isFetching, isError, refetch } = query;
  const ordersQuery = useGetAllOrdersQuery();

  const [selectedId, setSelectedId] = useState("");

  const sorted = useMemo(
    () => [...stations].sort((a, b) => a.name.localeCompare(b.name)),
    [stations],
  );
  const station = sorted.find((item) => item.id === selectedId) ?? sorted[0] ?? null;

  const figures = useMemo(() => {
    if (!station) return null;
    const code = station.code?.trim().toUpperCase();
    const orders = (ordersQuery.data ?? []).filter((order) =>
      order.delivery_station_code
        ? order.delivery_station_code.trim().toUpperCase() === code
        : (order.delivery_station_id ?? order.boarding_station_id) === station.id,
    );

    const byStatus = new Map<string, number>();
    let revenue = 0;
    let delivered = 0;
    let cancelled = 0;
    let inProgress = 0;

    orders.forEach((order) => {
      const status = String(order.status ?? "UNKNOWN").toUpperCase();
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
      if (status === "DELIVERED") {
        delivered += 1;
        revenue += Number(order.total) || 0;
      } else if (status === "CANCELLED") {
        cancelled += 1;
      } else if (IN_PROGRESS.includes(status)) {
        inProgress += 1;
      }
    });

    const recent = [...orders]
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .slice(0, 8);

    return {
      total: orders.length,
      delivered,
      cancelled,
      inProgress,
      revenue,
      average: delivered ? revenue / delivered : 0,
      cancelRate: orders.length ? Math.round((cancelled / orders.length) * 100) : 0,
      statuses: Array.from(byStatus.entries()).sort((a, b) => b[1] - a[1]),
      recent,
    };
  }, [station, ordersQuery.data]);

  const loadingOrders = ordersQuery.isLoading;
  const show = (value: string) => (loadingOrders || ordersQuery.isError ? "-" : value);

  const stats = figures
    ? [
        { id: "delivered", label: "Delivered", note: "Completed orders", value: show(String(figures.delivered)) },
        { id: "progress", label: "In progress", note: "Placed up to out for delivery", value: show(String(figures.inProgress)) },
        { id: "cancelled", label: "Cancelled", note: `${figures.cancelRate}% of orders`, value: show(String(figures.cancelled)) },
        { id: "revenue", label: "Revenue", note: "From delivered orders", value: show(rupees(figures.revenue)) },
        { id: "average", label: "Avg. order value", note: "Per delivered order", value: show(figures.delivered ? rupees(figures.average) : "-") },
      ]
    : [];

  return (
    <section className="user-management-workspace">
      {isError && (
        <div className="station-perf-error-row">
          <div className="api-state api-state--error">
            Unable to load stations. Check the API connection and try again.
          </div>
          <RefreshButton
            refreshing={isFetching || ordersQuery.isFetching}
            label="the station figures"
            onRefresh={() => {
              refetch();
              ordersQuery.refetch();
            }}
          />
        </div>
      )}

      {!isError && (
        <div className="station-perf-picker">
          <label>
            <span>Station</span>
            <select
              value={station?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={isLoading || !sorted.length}
            >
              {isLoading && <option>Loading stations\u2026</option>}
              {!isLoading && !sorted.length && <option>No stations yet</option>}
              {sorted.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.code ? ` (${item.code})` : ""}
                  {item.city ? ` \u2014 ${item.city}` : ""}
                </option>
              ))}
            </select>
          </label>

          {station && (
            <div className="station-perf-meta">
              <span>
                {[station.city, station.state].filter(Boolean).join(", ") || "Location not set"}
              </span>
              <ManagementStatus status={isStationActive(station) ? "Active" : "Inactive"} />
              <span>Added {formatDate(station.created_at)}</span>
            </div>
          )}

          <RefreshButton
            refreshing={isFetching || ordersQuery.isFetching}
            label="the station figures"
            onRefresh={() => {
              refetch();
              ordersQuery.refetch();
            }}
          />
        </div>
      )}

      {station && ordersQuery.isError && (
        <div className="api-state api-state--error">
          Unable to load orders, so the figures below are not available. Check the API connection and try again.
        </div>
      )}

      {station && (
        <>
          {figures && (
            <article className="station-perf-summary">
              <div className="station-perf-summary__lead">
                <span className="user-activity-icon tone-saffron">
                  <Icon name="bag" size={19} />
                </span>
                <p>Total orders</p>
                <strong>{show(String(figures.total))}</strong>
                <small>All orders for this station</small>
              </div>

              <dl className="station-perf-summary__stats">
                {stats.map((stat) => (
                  <div key={stat.id}>
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                    <small>{stat.note}</small>
                  </div>
                ))}
              </dl>
            </article>
          )}

          {figures && !loadingOrders && !ordersQuery.isError && (
            <div className="station-perf-panels">
              <section className="station-perf-panel">
                <h3 className="station-perf-heading">Orders by status</h3>
                {figures.statuses.length ? (
                  <ul className="station-perf-bars">
                    {figures.statuses.map(([status, count]) => (
                      <li key={status}>
                        <span>{STATUS_LABELS[status] ?? status}</span>
                        <div className="station-perf-bar">
                          <i style={{ width: `${Math.round((count / figures.total) * 100)}%` }} />
                        </div>
                        <strong>{count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="api-state station-perf-empty">No orders for this station yet.</div>
                )}
              </section>

              <section className="station-perf-panel station-perf-panel--orders">
                <h3 className="station-perf-heading">Recent orders</h3>
                {figures.recent.length ? (
                  <div className="station-perf-table-wrap">
                    <table className="user-table station-perf-orders-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {figures.recent.map((order) => (
                          <tr key={order.id}>
                            <td>{order.order_number ?? order.id.slice(0, 8)}</td>
                            <td>{formatStatusLabel(order.status_label ?? STATUS_LABELS[String(order.status).toUpperCase()] ?? order.status)}</td>
                            <td>{order.total == null ? "-" : rupees(Number(order.total) || 0)}</td>
                            <td>{formatDate(order.journey_date ?? order.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="api-state station-perf-empty">No orders for this station yet.</div>
                )}
              </section>
            </div>
          )}

          <small className="station-perf-note">
            Orders are matched to the station they are delivered at.
          </small>
        </>
      )}
    </section>
  );
}
