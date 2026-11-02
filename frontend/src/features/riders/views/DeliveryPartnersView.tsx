"use client";

import { UserAvatar } from "../../admin/components/UserAvatar";
import { useState, type FormEvent } from "react";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { SectionActions } from "../../admin/components/SectionActions";
import { PrimaryActionButton } from "../../admin/components/PrimaryActionButton";
import { ListToolbar } from "../../admin/components/ListToolbar";
import { ListPagination } from "../../admin/components/ListPagination";
import { ManagementStatus } from "../../admin/components/ManagementStatus";
import { SidePanel } from "../../admin/components/SidePanel";
import { RequiredFieldMark } from "../../admin/components/RequiredFieldMark";
import { errorMessage } from "../../admin/views/approvalShared";
import { useCreateRiderMutation, useGetRidersQuery, type Rider } from "../api/ridersApi";

type Partner = { id: string; name: string; mobile: string; station: string; detail: string; licenceNumber: string; status: string; imageUrl?: string };
// Handlers have no API yet, so they stay sample data.
const initialHandlers: Partner[] = [
  { id: "HDL001", name: "Priya Reddy", mobile: "9000000201", station: "Secunderabad Junction", detail: "Morning · 6 AM–2 PM", licenceNumber: "TS0920190012345", status: "Active" },
  { id: "HDL002", name: "Suresh Naidu", mobile: "9000000202", station: "Hyderabad Deccan", detail: "Evening · 2 PM–10 PM", licenceNumber: "TS1020180054321", status: "Active" },
  { id: "HDL003", name: "Meena Devi", mobile: "9000000203", station: "Vijayawada Junction", detail: "Morning · 6 AM–2 PM", licenceNumber: "AP1620170098765", status: "Inactive" },
  { id: "HDL004", name: "Vijay Kumar", mobile: "9000000204", station: "Warangal", detail: "Night · 10 PM–6 AM", licenceNumber: "TS0320210045678", status: "Active" },
];
const emptyForm = { name: "", mobile: "", station: "", detail: "", licenceNumber: "", vehicleType: "", vehicleNumber: "" };
const vehicleTypes = ["Bike", "Scooter", "Electric bike", "Bicycle"];
// Normalisers strip separators so "ts09 2019-0012345" and "TS0920190012345" are the same value.
const normalizeMobile = (value: string) => value.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, "");
const normalizeLicence = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();
const normalizeVehicle = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();
type FormErrors = Partial<Record<keyof typeof emptyForm, string>>;
const validate = (form: typeof emptyForm, handlers: boolean): FormErrors => {
  const errors: FormErrors = {};
  const name = form.name.trim();
  if (!name) errors.name = "Enter the full name.";
  else if (name.length < 2 || name.length > 100 || !/^[A-Za-z][A-Za-z .'-]*$/.test(name)) errors.name = "Use letters only (2–100 characters).";
  const mobile = normalizeMobile(form.mobile);
  if (!mobile) errors.mobile = "Enter the mobile number.";
  else if (!/^[6-9]\d{9}$/.test(mobile)) errors.mobile = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.";
  const licence = normalizeLicence(form.licenceNumber);
  if (!licence) errors.licenceNumber = "Enter the driving licence number.";
  else if (!/^[A-Z]{2}\d{2}(19|20)\d{2}\d{7}$/.test(licence)) errors.licenceNumber = "Use the format TS0920190012345 (state, RTO code, year, 7 digits).";
  if (handlers) {
    if (!form.station.trim()) errors.station = "Enter the station name.";
    if (!form.detail.trim()) errors.detail = "Enter the shift.";
  } else {
    const vehicle = normalizeVehicle(form.vehicleNumber);
    if (vehicle && !/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{2})$/.test(vehicle)) errors.vehicleNumber = "Use the format TS09AB1234.";
    if (vehicle && !form.vehicleType) errors.vehicleType = "Select the vehicle type.";
  }
  return errors;
};
const isInactive = (status: string) => ["inactive", "blocked", "rejected"].includes(status.toLowerCase());

const toPartner = (rider: Rider): Partner => ({
  id: rider.id,
  name: rider.full_name ?? "-",
  mobile: rider.phone ?? "-",
  station: "",
  detail: [rider.vehicle_type, rider.vehicle_number].filter(Boolean).join(" · ") || "-",
  licenceNumber: rider.license_number ?? "",
  status: rider.status ?? "-",
  imageUrl: rider.profile_image_url ?? "",
});

export function DeliveryPartnersView({ subsection }: { subsection: string }) {
  const handlers = subsection === "riders-handlers";
  const singular = handlers ? "handler" : "rider";
  const ridersQuery = useGetRidersQuery({ limit: 100 }, { refetchOnMountOrArgChange: true });
  const [createRider, { isLoading: saving }] = useCreateRiderMutation();
  const [handlerRows, setHandlers] = useState(initialHandlers);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState("");
  const [statusFilters, setStatusFilters] = useState({ riders: "all", handlers: "all" });
  const role = handlers ? "handlers" : "riders";
  const statusFilter = statusFilters[role];
  const source = handlers ? handlerRows : (ridersQuery.data ?? []).map(toPartner);
  const activeCount = source.filter((row) => row.status.toLowerCase() === "active").length;
  const inactiveCount = source.filter((row) => isInactive(row.status)).length;
  const term = search.trim().toLowerCase();
  const rows = source.filter((row) => (statusFilter === "all" || (statusFilter === "active" ? row.status.toLowerCase() === "active" : isInactive(row.status))) && Object.entries(row).some(([key, value]) => key !== "imageUrl" && String(value).toLowerCase().includes(term)));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / 10)));
  const [showErrors, setShowErrors] = useState(false);
  const errors = validate(form, handlers);
  const close = () => { if (saving) return; setOpen(false); setForm(emptyForm); setSubmitError(""); setShowErrors(false); };
  const set = (key: keyof typeof emptyForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const fieldError = (key: keyof typeof emptyForm) => showErrors && errors[key] ? <small className="field-error" role="alert">{errors[key]}</small> : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError("");
    if (Object.keys(errors).length) { setShowErrors(true); return; }
    if (handlers) {
      const partner: Partner = { id: `HDL${String(handlerRows.length + 1).padStart(3, "0")}`, name: form.name.trim(), mobile: normalizeMobile(form.mobile), station: form.station.trim(), detail: form.detail.trim(), licenceNumber: normalizeLicence(form.licenceNumber), status: "Active" };
      setHandlers((current) => [...current, partner]);
      setOpen(false); setForm(emptyForm); setSearch(""); setStatusFilters((current) => ({ ...current, handlers: "all" })); setPage(Math.ceil((handlerRows.length + 1) / 10));
      return;
    }
    try {
      await createRider({
        full_name: form.name.trim(),
        phone: normalizeMobile(form.mobile),
        license_number: normalizeLicence(form.licenceNumber),
        ...(form.vehicleType ? { vehicle_type: form.vehicleType } : {}),
        ...(form.vehicleNumber.trim() ? { vehicle_number: normalizeVehicle(form.vehicleNumber) } : {}),
      }).unwrap();
      setOpen(false); setForm(emptyForm); setSearch(""); setStatusFilters((current) => ({ ...current, riders: "all" })); setPage(1);
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  const columns = handlers ? ["Handler", "ID", "Mobile number", "Station", "Shift", "Licence number", "Status"] : ["Rider", "ID", "Mobile number", "Vehicle", "Licence number", "Status"];
  return <section className="user-management-workspace">
    <SectionActions><PrimaryActionButton type="button" onClick={() => { setForm(emptyForm); setSubmitError(""); setShowErrors(false); setOpen(true); }}>Add {singular}</PrimaryActionButton></SectionActions>
    <StatusTabs label={`Filter ${role} by status`} value={statusFilter} tabs={[{ id: "all", label: handlers ? "All Handlers" : "All Riders", count: source.length }, { id: "active", label: "Active", count: activeCount }, { id: "inactive", label: "Inactive / Blocked", count: inactiveCount }]} onChange={(value) => { setStatusFilters((current) => ({ ...current, [role]: value })); setPage(1); }} />
    <ListToolbar value={search} onChange={(value) => { setSearch(value); setPage(1); }} label={role} refreshing={!handlers && ridersQuery.isFetching} onRefresh={handlers ? undefined : () => void ridersQuery.refetch()} placeholder={`Search ${role} by name, ID, mobile, ${handlers ? "station or " : "vehicle or "}licence number`} />
    {!handlers && ridersQuery.isError && <div className="api-state api-state--error" role="alert">Unable to load riders. {errorMessage(ridersQuery.error)}</div>}
    <div className="user-table-wrap"><table className="user-table"><thead><tr>{columns.map((label) => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.slice((currentPage - 1) * 10, currentPage * 10).map((row) => <tr key={row.id}><td><div className="user-cell"><UserAvatar name={row.name} imageUrl={row.imageUrl} size="medium" /><span>{row.name}</span></div></td><td>{handlers ? row.id : row.id.slice(0, 8).toUpperCase()}</td><td>{row.mobile}</td>{handlers && <td>{row.station}</td>}<td>{row.detail}</td><td>{row.licenceNumber || "-"}</td><td><ManagementStatus status={row.status} /></td></tr>)}</tbody></table>{!rows.length && !(!handlers && (ridersQuery.isLoading || ridersQuery.isError)) && <div className="api-state">No {role} match your search or status filter.</div>}{!handlers && ridersQuery.isLoading && <div className="api-state">Loading riders…</div>}</div>
    {handlers && <p className="form-note">Sample data · Changes are kept only while this screen is open.</p>}
    {rows.length > 0 && <ListPagination page={currentPage} count={Math.ceil(rows.length / 10)} onChange={setPage} />}
    <SidePanel closeDisabled={saving} open={open} onClose={close} eyebrow="DELIVERY PARTNERS" title={`Add ${singular}`} description={handlers ? "Add a sample handler. No data will be sent to the server." : "Create a rider account. Riders start as pending until approved."} footer={<><button type="button" className="secondary-button" onClick={close} disabled={saving}>Cancel</button><PrimaryActionButton type="submit" form="delivery-partner-form" disabled={saving}>{saving ? "Adding..." : `Add ${singular}`}</PrimaryActionButton></>}>
      <form id="delivery-partner-form" className="form-grid delivery-partner-form" onSubmit={submit} noValidate>
        {submitError && <div className="api-state api-state--error" role="alert">{submitError}</div>}
        <label><span>Full name<RequiredFieldMark /></span><input value={form.name} onChange={set("name")} placeholder="Enter full name" maxLength={100} aria-invalid={showErrors && !!errors.name} />{fieldError("name")}</label>
        <label><span>Mobile number<RequiredFieldMark /></span><input type="tel" inputMode="numeric" value={form.mobile} onChange={set("mobile")} placeholder="10-digit mobile number" maxLength={14} aria-invalid={showErrors && !!errors.mobile} />{fieldError("mobile")}</label>
        {handlers ? <>
          <label><span>Station<RequiredFieldMark /></span><input value={form.station} onChange={set("station")} placeholder="Enter station name" aria-invalid={showErrors && !!errors.station} />{fieldError("station")}</label>
          <label><span>Shift<RequiredFieldMark /></span><input value={form.detail} onChange={set("detail")} placeholder="e.g. Morning, 6 AM–2 PM" aria-invalid={showErrors && !!errors.detail} />{fieldError("detail")}</label>
        </> : <>
          <label><span>Vehicle type</span><select value={form.vehicleType} onChange={set("vehicleType")} aria-invalid={showErrors && !!errors.vehicleType}><option value="">Select vehicle type</option>{vehicleTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>{fieldError("vehicleType")}</label>
          <label><span>Vehicle number</span><input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })} placeholder="e.g. TS09AB1234" maxLength={13} autoCapitalize="characters" aria-invalid={showErrors && !!errors.vehicleNumber} />{fieldError("vehicleNumber")}</label>
        </>}
        <label><span>Licence number<RequiredFieldMark /></span><input value={form.licenceNumber} onChange={(e) => setForm({ ...form, licenceNumber: e.target.value.toUpperCase() })} placeholder="e.g. TS0920190012345" maxLength={20} autoCapitalize="characters" aria-invalid={showErrors && !!errors.licenceNumber} />{fieldError("licenceNumber")}</label>
        {!handlers && <p className="form-note">Bank account details are added by the rider from the rider app.</p>}
      </form>
    </SidePanel>
  </section>;
}
