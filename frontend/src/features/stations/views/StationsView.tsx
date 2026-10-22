"use client";

import { useMemo, useState } from "react";

import { ConfirmDialog } from "../../admin/components/ConfirmDialog";
import { Icon } from "../../admin/components/Icon";
import { RefreshButton } from "../../admin/components/RefreshButton";
import { SidePanel } from "../../admin/components/SidePanel";
import { SkeletonTable } from "../../admin/components/Skeleton";
import { UserAvatar } from "../../admin/components/UserAvatar";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { StationLocationPicker, type PickedLocation } from "../components/StationLocationPicker";
import {
  useCreateStationMutation,
  useDeleteStationMutation,
  useGetStationsQuery,
  useUpdateStationMutation,
  type Station,
  type StationInput,
} from "../api/stationsApi";

type Props = {
  /** One of stations-all, stations-active, stations-inactive, stations-performance. */
  subsection: string;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export function StationsView({ subsection, canInsert, canUpdate, canDelete }: Props) {
  const stationsQuery = useGetStationsQuery();

  if (subsection === "stations-inactive") {
    return <InactiveStations />;
  }

  if (subsection === "stations-performance") {
    return <StationPerformance query={stationsQuery} />;
  }

  return (
    <StationList
      key={subsection}
      active={subsection === "stations-active"}
      query={stationsQuery}
      canInsert={canInsert}
      canUpdate={canUpdate}
      canDelete={canDelete}
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
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const emptyForm: FormValues = { name: "", code: "", city: "", state: "", latitude: "", longitude: "" };

const toForm = (station: Station): FormValues => ({
  name: station.name ?? "",
  code: station.code ?? "",
  city: station.city ?? "",
  state: station.state ?? "",
  latitude: station.latitude == null ? "" : String(station.latitude),
  longitude: station.longitude == null ? "" : String(station.longitude),
});

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

const formatCoordinate = (station: Station) => {
  const lat = Number(station.latitude);
  const lng = Number(station.longitude);
  if (station.latitude == null || station.longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return "—";
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ------------------------------------------------------------------ */
/* All Stations / Active Stations                                      */
/* ------------------------------------------------------------------ */

function StationList({
  active,
  query,
  canInsert,
  canUpdate,
  canDelete,
}: {
  active: boolean;
  query: StationsQuery;
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { data: stations = [], isLoading, isFetching, isError, refetch } = query;

  const [createStation, { isLoading: isCreating }] = useCreateStationMutation();
  const [updateStation, { isLoading: isUpdating }] = useUpdateStationMutation();
  const [deleteStation, { isLoading: isDeleting }] = useDeleteStationMutation();

  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [showErrors, setShowErrors] = useState(false);
  const [formError, setFormError] = useState("");
  const [toDelete, setToDelete] = useState<Station | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const saving = isCreating || isUpdating;
  const errors = validate(values);
  const hasErrors = Object.keys(errors).length > 0;

  const term = search.trim().toLowerCase();
  const matching = term
    ? stations.filter((station) =>
        [station.name, station.code, station.city, station.state].some((value) =>
          String(value ?? "").toLowerCase().includes(term),
        ),
      )
    : stations;

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
    [saving, "Saving the station…"],
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
        await createStation(payload).unwrap();
        setSavedMessage(`${payload.name} was added.`);
      }
      setPanelOpen(false);
    } catch (error) {
      setFormError(errorText(error, "The station could not be saved. Try again."));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleteError("");
    try {
      await deleteStation(toDelete.id).unwrap();
      setSavedMessage(`${toDelete.name} was deleted.`);
      setToDelete(null);
    } catch (error) {
      setDeleteError(errorText(error, "The station could not be deleted."));
    }
  };

  const columns = ["Station", "Code", "City", "State", "Coordinates", active ? "Status" : "Added", ...(active ? [] : ["Action"])];

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          <span className="eyebrow">{active ? "ACTIVE STATIONS" : "ALL STATIONS"}</span>
          <h2>{active ? "Active stations" : "All stations"}</h2>
          <p>
            {active
              ? "Stations customers can currently pick. The stations API has no status field yet, so every configured station is shown as active."
              : "Railway stations customers can order at. Add a station here and it appears in the customer station list."}
          </p>
        </div>

        <div className="employee-header-actions">
          <RefreshButton refreshing={isFetching} label="the stations" onRefresh={() => refetch()} />

          {!active && (
            <button
              type="button"
              className="primary-button"
              onClick={openAdd}
              disabled={!canInsert}
              data-tooltip={canInsert ? undefined : noAccess("add stations")}
              data-tooltip-kind="access"
            >
              Add station
            </button>
          )}
        </div>
      </header>

      {savedMessage && <div className="success-banner">{savedMessage}</div>}

      <div className="workspace-stat-row">
        <div>
          <strong>{isLoading ? "…" : term ? `${matching.length} of ${stations.length}` : stations.length}</strong>
          <span>{active ? "Active stations" : "Stations"}</span>
        </div>
      </div>

      <div className="list-search">
        <input
          type="search"
          placeholder="Search by station, code, city or state"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search stations"
        />
      </div>

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
              {matching.map((station) => (
                <tr key={station.id}>
                  <td>
                    <div className="restaurant-cell">
                      <UserAvatar name={station.name} size="medium" />
                      <div>
                        <strong>{station.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{station.code ?? "—"}</td>
                  <td>{station.city ?? "—"}</td>
                  <td>{station.state ?? "—"}</td>
                  <td>{formatCoordinate(station)}</td>

                  {active ? (
                    <td>
                      <span className="status-pill status-pill--live">
                        <i />
                        Active
                      </span>
                    </td>
                  ) : (
                    <>
                      <td>{formatDate(station.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => openEdit(station)}
                          disabled={!canUpdate}
                          data-tooltip={canUpdate ? undefined : noAccess("edit stations")}
                          data-tooltip-kind="access"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="table-action table-action--danger"
                          onClick={() => {
                            setDeleteError("");
                            setToDelete(station);
                          }}
                          disabled={!canDelete}
                          data-tooltip={canDelete ? undefined : noAccess("delete stations")}
                          data-tooltip-kind="access"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {!matching.length && (
            <div className="api-state">
              {stations.length ? `No stations match "${search.trim()}".` : "No stations yet. Use “Add station” to create the first one."}
            </div>
          )}
        </div>
      )}

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
            <span>Station name *</span>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="e.g. Secunderabad Junction"
              maxLength={NAME_MAX}
              disabled={saving}
            />
            {showErrors && errors.name && <small className="field-error" role="alert">{errors.name}</small>}
          </label>

          <label>
            <span>Station code *</span>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              placeholder="e.g. SC"
              maxLength={CODE_MAX}
              disabled={saving}
            />
            {showErrors && errors.code ? (
              <small className="field-error" role="alert">{errors.code}</small>
            ) : (
              <small>Saved in capitals. Each code must be unique.</small>
            )}
          </label>

          <label>
            <span>City *</span>
            <input
              value={values.city}
              onChange={(event) => setField("city", event.target.value)}
              placeholder="e.g. Hyderabad"
              maxLength={PLACE_MAX}
              disabled={saving}
            />
            {showErrors && errors.city && <small className="field-error" role="alert">{errors.city}</small>}
          </label>

          <label>
            <span>State *</span>
            <input
              value={values.state}
              onChange={(event) => setField("state", event.target.value)}
              placeholder="e.g. Telangana"
              maxLength={PLACE_MAX}
              disabled={saving}
            />
            {showErrors && errors.state && <small className="field-error" role="alert">{errors.state}</small>}
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

          <button
            type="button"
            className="primary-button"
            onClick={submit}
            disabled={Boolean(saveBlocked)}
            data-tooltip={saveBlocked}
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add station"}
          </button>
        </div>
      </SidePanel>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete station?"
        message={
          <>
            <strong>{toDelete?.name}</strong> will be removed and customers will no longer see it. This can’t be undone.
            {deleteError && <div className="api-state api-state--error">{deleteError}</div>}
          </>
        }
        confirmLabel="Delete station"
        busyLabel="Deleting…"
        busy={isDeleting}
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Inactive / Suspended                                                */
/* ------------------------------------------------------------------ */

function InactiveStations() {
  const columns = ["Station", "Code", "City", "Reason", "Suspended on"];

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          <span className="eyebrow">INACTIVE / SUSPENDED</span>
          <h2>Inactive / suspended stations</h2>
          <p>Stations paused for customers, with the reason and date, and a way to bring them back.</p>
        </div>
      </header>

      <div className="workspace-stat-row">
        <div>
          <strong>—</strong>
          <span>Inactive stations</span>
        </div>
      </div>

      <div className="user-table-wrap">
        <table className="user-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody />
        </table>

        <div className="api-state">
          Suspending a station isn’t available yet. The stations API has no status field, so nothing can be listed
          here. Once it does, suspended stations will appear in this table.
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Station Performance                                                 */
/* ------------------------------------------------------------------ */

function StationPerformance({ query }: { query: StationsQuery }) {
  const { data: stations = [], isLoading, isFetching, isError, refetch } = query;

  const coverage = useMemo(() => {
    const cities = new Set<string>();
    const states = new Map<string, { stations: number; cities: Set<string> }>();
    let withCoordinates = 0;

    stations.forEach((station) => {
      const city = station.city?.trim();
      const state = station.state?.trim() || "Not set";
      if (city) cities.add(city.toLowerCase());
      const entry = states.get(state) ?? { stations: 0, cities: new Set<string>() };
      entry.stations += 1;
      if (city) entry.cities.add(city.toLowerCase());
      states.set(state, entry);
      if (Number.isFinite(Number(station.latitude)) && Number.isFinite(Number(station.longitude)) && station.latitude != null && station.longitude != null) {
        withCoordinates += 1;
      }
    });

    return {
      cities: cities.size,
      withCoordinates,
      states: Array.from(states.entries())
        .map(([state, entry]) => ({ state, stations: entry.stations, cities: entry.cities.size }))
        .sort((a, b) => b.stations - a.stations),
    };
  }, [stations]);

  const number = (value: number) => (isLoading || isError ? "—" : String(value));

  const coverageCards = [
    { id: "total", label: "Total stations", description: "Stations configured in the system", icon: "station", tone: "saffron", value: number(stations.length) },
    { id: "cities", label: "Cities covered", description: "Distinct cities with a station", icon: "store", tone: "orange", value: number(coverage.cities) },
    { id: "states", label: "States covered", description: "Distinct states with a station", icon: "chart", tone: "indigo", value: number(coverage.states.length) },
    { id: "coords", label: "With map location", description: "Stations that have latitude and longitude", icon: "check", tone: "mint", value: number(coverage.withCoordinates) },
  ] as const;

  // Order-based figures have no API yet, so they show "—" rather than invented numbers.
  const orderCards = [
    { id: "orders", label: "Orders per station", description: "Orders placed at each station", icon: "bag", tone: "violet" },
    { id: "delivery", label: "Average delivery time", description: "Time from order to hand-over", icon: "chart", tone: "slate" },
    { id: "restaurants", label: "Restaurants per station", description: "Restaurants serving each station", icon: "store", tone: "orange" },
  ] as const;

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          <span className="eyebrow">STATION PERFORMANCE</span>
          <h2>Station performance</h2>
          <p>Where the network reaches today. Order figures will fill in once the orders data is connected.</p>
        </div>

        <RefreshButton refreshing={isFetching} label="the stations" onRefresh={() => refetch()} />
      </header>

      {isError && (
        <div className="api-state api-state--error">
          Unable to load stations. Check the API connection and try again.
        </div>
      )}

      <div className="user-activity-grid">
        {coverageCards.map((card) => (
          <article className={`user-activity-card user-activity-card--${card.tone}`} key={card.id}>
            <div className="user-activity-card__top">
              <span className={`user-activity-icon tone-${card.tone}`}>
                <Icon name={card.icon} size={19} />
              </span>
            </div>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <small>{card.description}</small>
          </article>
        ))}

        {orderCards.map((card) => (
          <article className={`user-activity-card user-activity-card--${card.tone}`} key={card.id}>
            <div className="user-activity-card__top">
              <span className={`user-activity-icon tone-${card.tone}`}>
                <Icon name={card.icon} size={19} />
              </span>
            </div>
            <p>{card.label}</p>
            <strong>—</strong>
            <small>{card.description}</small>
          </article>
        ))}
      </div>

      {isLoading && !isError && <SkeletonTable columns={["State", "Stations", "Cities"]} rows={4} />}

      {!isLoading && !isError && (
        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>State</th>
                <th>Stations</th>
                <th>Cities</th>
              </tr>
            </thead>
            <tbody>
              {coverage.states.map((row) => (
                <tr key={row.state}>
                  <td>{row.state}</td>
                  <td>{row.stations}</td>
                  <td>{row.cities}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!coverage.states.length && <div className="api-state">No stations yet.</div>}
        </div>
      )}
    </section>
  );
}
