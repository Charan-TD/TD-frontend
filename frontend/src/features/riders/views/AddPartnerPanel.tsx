"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";

import { Icon } from "../../admin/components/Icon";
import { SidePanel } from "../../admin/components/SidePanel";
import { normalizeIndianMobile } from "../../admin/components/PhoneInput";
import { errorMessage } from "../../admin/views/approvalShared";
import { useGetAllStationsQuery } from "../../stations/api/stationsApi";
import { useCreateRiderMutation } from "../api/ridersApi";
import { SHIFTS, addHandler } from "../viewmodels/handlersStore";

type Kind = "rider" | "handler";

const MAX_DOC_BYTES = 5 * 1024 * 1024;

const DOCUMENTS: Record<Kind, string[]> = {
  rider: ["Aadhaar card", "Driving licence", "Vehicle RC", "Photo"],
  handler: ["Aadhaar card", "Photo", "Police verification", "Railway platform pass"],
};

const normalizeLicence = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();
const normalizeVehicle = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

type Form = { name: string; mobile: string; station: string; vehicleNumber: string; licenceNumber: string; platforms: string; shift: string };
const empty: Form = { name: "", mobile: "", station: "", vehicleNumber: "", licenceNumber: "", platforms: "", shift: SHIFTS[0] };

function validate(form: Form, kind: Kind): Partial<Record<keyof Form, string>> {
  const errors: Partial<Record<keyof Form, string>> = {};
  const name = form.name.trim();
  if (!name) errors.name = "Enter the full name.";
  else if (name.length < 2 || name.length > 100 || !/^[A-Za-z][A-Za-z .'-]*$/.test(name)) errors.name = "Use letters only (2–100 characters).";
  const mobile = normalizeIndianMobile(form.mobile);
  if (!mobile) errors.mobile = "Enter the mobile number.";
  else if (!/^[6-9]\d{9}$/.test(mobile)) errors.mobile = "Enter a valid 10-digit mobile number.";
  if (!form.station) errors.station = "Select the station.";
  if (kind === "rider") {
    const vehicle = normalizeVehicle(form.vehicleNumber);
    if (!vehicle) errors.vehicleNumber = "Enter the vehicle number.";
    else if (!/^([A-Z]{2}\d{2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{2})$/.test(vehicle)) errors.vehicleNumber = "Use the format TS09AB1234.";
    const licence = normalizeLicence(form.licenceNumber);
    if (!licence) errors.licenceNumber = "Enter the licence number.";
    else if (!/^[A-Z]{2}\d{2}(19|20)\d{2}\d{7}$/.test(licence)) errors.licenceNumber = "Use the format TS0920190012345.";
  } else if (!form.platforms.trim()) errors.platforms = "Enter the platforms.";
  return errors;
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="td-menu-field">
      <span>{label}<em> *</em></span>
      {children}
      {error && <small className="td-field-error">{error}</small>}
    </label>
  );
}

/** A dashed upload tile. The file is only kept for the form: no upload endpoint exists yet. */
function UploadTile({ label, file, onPick }: { label: string; file: File | null; onPick: (file: File | null) => void }) {
  const [error, setError] = useState("");
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(picked.type)) return setError("Choose a JPG or PDF.");
    if (picked.size > MAX_DOC_BYTES) return setError("Up to 5 MB.");
    setError("");
    onPick(picked);
  };
  return (
    <label className={`td-dp-upload${file ? " has-file" : ""}`}>
      <span className="td-dp-upload-icon"><Icon name={file ? "check" : "download"} size={14} /></span>
      <span className="td-dp-upload-copy">
        <b>{label}</b>
        <small className={error ? "is-error" : undefined}>{error || (file ? file.name : "JPG or PDF, up to 5 MB")}</small>
      </span>
      <u>{file ? "Change" : "Upload"}</u>
      <input type="file" accept="image/jpeg,image/png,application/pdf" hidden onChange={choose} />
    </label>
  );
}

export function AddPartnerPanel({ kind, onClose, onSaved }: { kind: Kind; onClose: () => void; onSaved: (name: string) => void }) {
  const { data: stations = [] } = useGetAllStationsQuery();
  const [createRider, { isLoading: saving }] = useCreateRiderMutation();
  const [form, setForm] = useState<Form>(empty);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const errors = validate(form, kind);
  const set = (key: keyof Form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  const show = (key: keyof Form) => (showErrors ? errors[key] : undefined);

  const submit = async () => {
    setSubmitError("");
    if (Object.keys(errors).length) return setShowErrors(true);
    const mobile = normalizeIndianMobile(form.mobile);
    if (kind === "handler") {
      addHandler({ name: form.name.trim(), mobile, station: form.station, platforms: form.platforms.trim(), shift: form.shift });
      return onSaved(form.name.trim());
    }
    try {
      // Station and the document files are not accepted by the rider API yet, so they are not sent.
      await createRider({
        full_name: form.name.trim(),
        phone: mobile,
        license_number: normalizeLicence(form.licenceNumber),
        vehicle_number: normalizeVehicle(form.vehicleNumber),
        status: "ACTIVE",
      }).unwrap();
      onSaved(form.name.trim());
    } catch (error) {
      setSubmitError(errorMessage(error));
    }
  };

  const title = kind === "rider" ? "Add rider" : "Add handler";
  return (
    <SidePanel open onClose={saving ? () => undefined : onClose} closeDisabled={saving} title={title}
      description={kind === "rider" ? "Riders pick up food from restaurants and deliver it to the train." : "Handlers receive orders at the station and hand them to passengers at the coach."}
      footer={<><button type="button" className="td-btn td-btn--small" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="td-btn td-btn--primary td-btn--small" onClick={() => void submit()} disabled={saving}>{saving ? "Adding…" : title}</button></>}>
      <div className="td-dp-form">
        {submitError && <div className="api-state api-state--error" role="alert">{submitError}</div>}

        <h4>Personal details</h4>
        <div className="td-dp-row">
          <Field label="Full name" error={show("name")}><input value={form.name} onChange={set("name")} placeholder={kind === "rider" ? "e.g. Suresh Reddy" : "e.g. Lakshmi Devi"} maxLength={100} disabled={saving} /></Field>
          <Field label="Mobile number" error={show("mobile")}><input value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value.replace(/\D/g, "").slice(0, 10) })} placeholder="10-digit mobile" inputMode="numeric" disabled={saving} /></Field>
        </div>

        {kind === "rider" ? (
          <>
            <Field label="Station" error={show("station")}>
              <select value={form.station} onChange={set("station")} disabled={saving}>
                <option value="">Select station</option>
                {stations.map((station) => <option key={station.id} value={station.name}>{station.name}</option>)}
              </select>
            </Field>
            <h4>Vehicle</h4>
            <div className="td-dp-row">
              <Field label="Vehicle number" error={show("vehicleNumber")}><input value={form.vehicleNumber} onChange={(event) => setForm({ ...form, vehicleNumber: event.target.value.toUpperCase() })} placeholder="E.G. TS10CD5678" maxLength={13} disabled={saving} /></Field>
              <Field label="Licence number" error={show("licenceNumber")}><input value={form.licenceNumber} onChange={(event) => setForm({ ...form, licenceNumber: event.target.value.toUpperCase() })} placeholder="E.G. TS10DL234567" maxLength={20} disabled={saving} /></Field>
            </div>
          </>
        ) : (
          <>
            <h4>Work</h4>
            <Field label="Station" error={show("station")}>
              <select value={form.station} onChange={set("station")} disabled={saving}>
                <option value="">Select station</option>
                {stations.map((station) => <option key={station.id} value={station.name}>{station.name}</option>)}
              </select>
            </Field>
            <div className="td-dp-row">
              <Field label="Platforms" error={show("platforms")}><input value={form.platforms} onChange={set("platforms")} placeholder="e.g. 1-4 or All platforms" maxLength={60} /></Field>
              <Field label="Shift">
                <select value={form.shift} onChange={set("shift")}>{SHIFTS.map((shift) => <option key={shift} value={shift}>{shift}</option>)}</select>
              </Field>
            </div>
          </>
        )}

        <h4>Documents</h4>
        <div className="td-dp-uploads">
          {DOCUMENTS[kind].map((label) => <UploadTile key={label} label={label} file={files[label] ?? null} onPick={(file) => setFiles({ ...files, [label]: file })} />)}
        </div>

        <p className="td-rd-info"><Icon name="info" size={16} /><span>Added by admin, so they&apos;re approved straight away and can log in with their mobile number.</span></p>
      </div>
    </SidePanel>
  );
}
