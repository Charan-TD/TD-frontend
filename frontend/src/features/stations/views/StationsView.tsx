"use client";

import { useMemo, useState, type ReactNode } from "react";

import { Icon } from "../../admin/components/Icon";
import { PageFooter } from "../../admin/components/PageFooter";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { SidePanel } from "../../admin/components/SidePanel";
import { SkeletonTable } from "../../admin/components/Skeleton";
import { StatusSwitch } from "../../admin/components/StatusSwitch";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { disabledReason, noAccess } from "../../admin/models/disabledReason";
import { StationLocationPicker, type PickedLocation } from "../components/StationLocationPicker";
import {
  useCreateStationMutation,
  useGetAllStationsQuery,
  useUpdateStationMutation,
  type Station,
  type StationInput,
} from "../api/stationsApi";

type Props = {
  canInsert: boolean;
  canUpdate: boolean;
};

export function StationsView({ canInsert, canUpdate }: Props) {
  return <StationList canInsert={canInsert} canUpdate={canUpdate} />;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const NAME_MAX = 255;
const CODE_MAX = 20;
const PLACE_MAX = 100;
const PAGE_SIZE = 10;

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
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const initials = (station: Station) => (station.code?.trim() || station.name.trim().slice(0, 2)).toUpperCase();

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="td-menu-field">
      <span>{label}<em> *</em></span>
      {children}
      {error ? <small className="td-field-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* All stations                                                        */
/* ------------------------------------------------------------------ */

function StationList({ canInsert, canUpdate }: Props) {
  const { data: stations = [], isLoading, isError } = useGetAllStationsQuery();

  const [createStation, { isLoading: isCreating }] = useCreateStationMutation();
  const [updateStation, { isLoading: isUpdating }] = useUpdateStationMutation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StationFilter>("all");
  const [page, setPage] = useState(1);
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

  const term = search.trim().toLowerCase();
  const scoped = term
    ? stations.filter((station) => [station.name, station.code, station.city, station.state].some((value) => String(value ?? "").toLowerCase().includes(term)))
    : stations;
  const counts = { all: scoped.length, active: scoped.filter(isStationActive).length, inactive: scoped.filter((station) => !isStationActive(station)).length };
  const filtered = scoped.filter((station) => statusFilter === "all" || (statusFilter === "active" ? isStationActive(station) : !isStationActive(station)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

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
    setValues((currentValues) => ({ ...currentValues, [field]: field === "code" ? value.toUpperCase() : value }));

  // Coordinates stay in the form state only; the admin just sees the map and address.
  const applyLocation = (location: PickedLocation) =>
    setValues((currentValues) => ({
      ...currentValues,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      city: location.city || currentValues.city,
      state: location.state || currentValues.state,
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

  const columns = ["Station", "City · State", "Restaurants", "Added", "Status"];

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search station, code, city or state" />
      <SectionActions>
        <button type="button" className="td-btn td-btn--primary" onClick={openAdd} disabled={!canInsert} data-tooltip={canInsert ? undefined : noAccess("add stations")} data-tooltip-kind="access">
          <Icon name="plus" size={14} />Add station
        </button>
      </SectionActions>

      <TransientSuccessMessage message={savedMessage} />
      {actionError && <div className="api-state api-state--error" role="alert">{actionError}</div>}
      {isError && <div className="api-state api-state--error" role="alert">Unable to load stations. Check the API connection and try again.</div>}

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label="Filter stations by status" value={statusFilter} onChange={(value) => { setStatusFilter(value as StationFilter); setPage(1); }}
            tabs={[{ id: "all", label: "All stations", count: counts.all }, { id: "active", label: "Active", count: counts.active }, { id: "inactive", label: "Inactive", count: counts.inactive }]} />
        </div>

        {isLoading && !isError && <SkeletonTable columns={columns} />}

        {!isLoading && !isError && (
          <>
            <div className="td-table-scroll">
              <table className="td-table">
                <thead>
                  <tr>
                    {columns.map((column) => <th key={column}>{column}</th>)}
                    <th><span className="td-sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((station) => {
                    const active = isStationActive(station);
                    return (
                      <tr key={station.id}>
                        <td><div className="td-st-name"><span className="td-st-code">{initials(station)}</span>{station.name}</div></td>
                        <td><div className="td-contact"><span>{station.city ?? "—"}</span><small>{station.state ?? ""}</small></div></td>
                        {/* The station API does not return how many restaurants are linked. */}
                        <td className="td-faint">—</td>
                        <td className="td-muted">{formatDate(station.created_at)}</td>
                        <td>
                          <StatusSwitch checked={active} onLabel="On" offLabel="Off" label={`${active ? "Turn off" : "Turn on"} ${station.name}`}
                            disabled={!canUpdate || togglingId === station.id} tooltip={!canUpdate ? noAccess("change station status") : undefined} tooltipKind={!canUpdate ? "access" : undefined}
                            onChange={() => void toggleStatus(station)} />
                        </td>
                        <td className="td-th-right">
                          <button type="button" className="td-icon-btn" aria-label={`Edit ${station.name}`} onClick={() => openEdit(station)} disabled={!canUpdate}
                            data-tooltip={!canUpdate ? noAccess("edit stations") : undefined} data-tooltip-kind={!canUpdate ? "access" : undefined}><Icon name="edit" size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && <div className="api-state">{term ? `No stations match "${search.trim()}".` : "No stations in this status."}</div>}
            </div>
            {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun="stations" onChange={setPage} />}
          </>
        )}
      </div>

      <SidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editing ? "Edit station" : "Add station"}
        description={editing ? "Update the station details." : "Restaurants can be linked to this station once it’s added."}
        closeDisabled={saving}
        footer={(
          <>
            <button type="button" className="td-btn td-btn--small" onClick={closePanel} disabled={saving}>Cancel</button>
            <button type="button" className="td-btn td-btn--primary td-btn--small" onClick={() => void submit()} disabled={Boolean(saveBlocked)} data-tooltip={saveBlocked}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add station"}
            </button>
          </>
        )}
      >
        <div className="td-st-form">
          {formError && <div className="api-state api-state--error" role="alert">{formError}</div>}

          <div className="td-st-row">
            <Field label="Station name" error={showErrors ? errors.name : undefined}>
              <input value={values.name} onChange={(event) => setField("name", event.target.value)} placeholder="e.g. Secunderabad Junction" maxLength={NAME_MAX} disabled={saving} />
            </Field>
            <Field label="Station code" error={showErrors ? errors.code : undefined} hint="Capital letters, must be unique">
              <input value={values.code} onChange={(event) => setField("code", event.target.value)} placeholder="E.G. SC" maxLength={CODE_MAX} disabled={saving} />
            </Field>
          </div>
          <div className="td-st-row">
            <Field label="City" error={showErrors ? errors.city : undefined}>
              <input value={values.city} onChange={(event) => setField("city", event.target.value)} placeholder="e.g. Hyderabad" maxLength={PLACE_MAX} disabled={saving} />
            </Field>
            <Field label="State" error={showErrors ? errors.state : undefined}>
              <input value={values.state} onChange={(event) => setField("state", event.target.value)} placeholder="e.g. Telangana" maxLength={PLACE_MAX} disabled={saving} />
            </Field>
          </div>

          <div className="td-st-status">
            <div><b>Status</b><small>Off stations are hidden from customers</small></div>
            <StatusSwitch checked={values.status === "active"} onLabel="On" offLabel="Off" label="Station status" disabled={saving}
              onChange={(next) => setValues((currentValues) => ({ ...currentValues, status: next ? "active" : "inactive" }))} />
          </div>

          <StationLocationPicker latitude={values.latitude} longitude={values.longitude} onChange={applyLocation} disabled={saving} />
        </div>
      </SidePanel>
    </section>
  );
}
