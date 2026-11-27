"use client";

import { useState, type ReactNode } from "react";

import type { RestaurantReview } from "../../restaurants/api/registrationRequestsApi";
import { cuisineNames, useGetCuisinesQuery } from "../../restaurants/api/cuisinesApi";
import { ridersOwnerLabel, str } from "./approvalShared";
import { WEEK, clock, type DayHours } from "./RegistrationApprovalsPanel";

const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="td-rd-fact"><small>{label}</small><span>{children}</span></div>;
}

const slotsOf = (entry: DayHours | null | undefined) => (entry?.slots ?? []).filter((slot) => slot.opening_time && slot.closing_time);

/** "Open now · closes 11:00 PM" from the restaurant's live status and today's last slot. */
function hoursSummary(hours: Record<string, DayHours | null> | null, online: string | null, todayKey: string): string | null {
  if (!hours) return null;
  if (online === "CLOSED") return "Closed now";
  if (online !== "OPEN") return null;
  const slots = slotsOf(hours[todayKey]);
  const last = slots[slots.length - 1];
  return last ? `Open now · closes ${clock(last.closing_time)}` : "Open now";
}

function HoursRow({ day, entry, today }: { day: string; entry: DayHours | null | undefined; today: boolean }) {
  const slots = slotsOf(entry);
  let value: ReactNode;
  if (entry?.is_24_hours) value = "Open 24 hours";
  else if (!entry || entry.is_open === false || slots.length === 0) value = <em className="td-rd-closed">Closed</em>;
  else value = slots.map((slot) => `${clock(slot.opening_time)} – ${clock(slot.closing_time)}`).join("  ·  ");
  return (
    <div className={`td-rd-hours-row${today ? " is-today" : ""}`}>
      <span>{day}{today && <small> · Today</small>}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function RestaurantDetailsTab({ r }: { r: RestaurantReview }) {
  const { data: cuisines = [] } = useGetCuisinesQuery();
  const [today] = useState(() => dayKeys[new Date().getDay()]);

  const hours = r.operating_hours && typeof r.operating_hours === "object" ? (r.operating_hours as Record<string, DayHours | null>) : null;
  const online = typeof r.online_status === "string" ? r.online_status : null;
  const summary = hoursSummary(hours, online, today);

  const documents: { label: string; number: string; detail?: string; url: unknown; stored: unknown }[] = [
    { label: "PAN card", number: str(r.pan), url: r.pan_document_url, stored: r.pan_document_id },
    { label: "GST certificate", number: str(r.gstin), url: r.gst_document_url, stored: r.gst_document_id },
    { label: "FSSAI licence", number: str(r.fssai_number), detail: r.fssai_valid_until ? `valid until ${str(r.fssai_valid_until)}` : undefined, url: r.fssai_document_url, stored: r.fssai_document_id },
    { label: "Business proof", number: str(r.business_proof_document_number), url: r.business_proof_document_url, stored: r.business_proof_document_id },
    { label: "Aadhaar card", number: str(r.aadhaar_number), url: r.aadhaar_document_url, stored: r.aadhaar_document_id },
    { label: "Bank proof", number: str(r.account_number) === "-" ? "-" : str(r.bank_name), url: r.bank_proof_url, stored: r.bank_proof_id },
  ];
  // The list response carries storage keys but no signed links; either one means it was uploaded.
  const uploaded = (doc: (typeof documents)[number]) => typeof doc.url === "string" || (typeof doc.stored === "string" && !!doc.stored);
  const uploadedCount = documents.filter(uploaded).length;

  return (
    <div className="td-rd-card">
      <section>
        <h3>Restaurant details</h3>
        <div className="td-rd-facts">
          <Fact label="Type">{str(r.restaurant_type)}</Fact>
          <Fact label="Cuisines">{str(cuisineNames(r.cuisines, cuisines))}</Fact>
          <Fact label="Food served">{str(r.food_served)}</Fact>
          <Fact label="Delivery riders">{ridersOwnerLabel(r.riders_owner)}</Fact>
        </div>
      </section>

      <section>
        <h3>Opening hours{summary && <small>{summary}</small>}</h3>
        {hours ? (
          <div className="td-rd-hours">
            <div>{WEEK.slice(0, 4).map((day) => <HoursRow key={day.key} day={day.label} entry={hours[day.key]} today={day.key === today} />)}</div>
            <div>{WEEK.slice(4).map((day) => <HoursRow key={day.key} day={day.label} entry={hours[day.key]} today={day.key === today} />)}</div>
          </div>
        ) : <p className="td-rd-empty">Opening hours not added.</p>}
      </section>

      <section>
        <h3>Bank account</h3>
        <div className="td-rd-facts">
          <Fact label="Account holder">{str(r.account_holder_name)}</Fact>
          <Fact label="Bank">{str(r.bank_name)}</Fact>
          <Fact label="Account number">{str(r.account_number)}</Fact>
          <Fact label="IFSC">{str(r.ifsc)}</Fact>
        </div>
      </section>

      <section>
        <h3>Business documents<small>{uploadedCount} of {documents.length} uploaded</small></h3>
        <ul className="td-rd-docs">
          {documents.map((doc) => {
            const url = typeof doc.url === "string" ? doc.url : null;
            const ok = uploaded(doc);
            return (
              <li key={doc.label}>
                <span>{doc.label}</span>
                <b>{doc.number}{doc.detail && ` · ${doc.detail}`}</b>
                <i className={ok ? "is-ok" : "is-missing"}>{ok ? "Uploaded" : "Not uploaded"}</i>
                {url ? <a className="td-view-link" href={url} target="_blank" rel="noopener noreferrer">View</a> : <span className="td-view-link td-faint">{ok ? "Link unavailable" : ""}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
