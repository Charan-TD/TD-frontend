"use client";

import { useState } from "react";

import { Icon } from "../../admin/components/Icon";
import { InitialsAvatar } from "../../admin/components/InitialsAvatar";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { SidePanel } from "../../admin/components/SidePanel";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { errorMessage } from "../../admin/views/approvalShared";
import { useGetAllRidersQuery, useUpdateRiderStatusMutation, type Rider } from "../api/ridersApi";
import { setHandlerStatus, useHandlers } from "../viewmodels/handlersStore";

type Kind = "rider" | "handler";

type Card = {
  key: string;
  kind: Kind;
  name: string;
  imageUrl?: string | null;
  /** Days since the application, or null when unknown. */
  appliedDaysAgo: number | null;
  mobile: string;
  station: string;
  details: [string, string][];
  checks: { label: string; ok: boolean }[];
};

const dash = (value: string | null | undefined) => (value && value.trim() ? value : "—");
const spaced = (mobile: string | null | undefined) => (mobile && /^\d{10}$/.test(mobile) ? `${mobile.slice(0, 5)} ${mobile.slice(5)}` : dash(mobile));

const applied = (days: number | null) => (days == null ? "applied" : days <= 0 ? "applied today" : days === 1 ? "applied yesterday" : `applied ${days} days ago`);

export function PartnerApprovalsView() {
  const ridersQuery = useGetAllRidersQuery();
  const handlers = useHandlers();
  const [updateRiderStatus] = useUpdateRiderStatusMutation();
  const [now] = useState(() => Date.now());

  const [kind, setKind] = useState<Kind>("rider");
  const [search, setSearch] = useState("");
  const [station, setStation] = useState("all");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Card | null>(null);

  const riderCards: Card[] = (ridersQuery.data ?? [])
    .filter((rider: Rider) => String(rider.status ?? "").toUpperCase() === "PENDING")
    .map((rider) => {
      const created = rider.created_at ? new Date(rider.created_at).getTime() : NaN;
      return {
        key: rider.id, kind: "rider" as const, name: rider.full_name ?? "—", imageUrl: rider.profile_image_url,
        appliedDaysAgo: Number.isNaN(created) ? null : Math.max(0, Math.floor((now - created) / 86_400_000)),
        mobile: spaced(rider.phone), station: "—",
        details: [["Vehicle number", dash(rider.vehicle_number)], ["Licence", dash(rider.license_number)]],
        checks: [
          { label: "Aadhaar", ok: !!rider.aadhaar_number || !!rider.aadhaar_verified },
          { label: "Driving licence", ok: !!rider.license_number },
          { label: "Vehicle RC", ok: !!rider.vehicle_number },
          { label: "Photo", ok: !!rider.profile_image_url },
        ],
      };
    });
  const handlerCards: Card[] = handlers
    .filter((handler) => handler.status === "pending")
    .map((handler) => ({
      key: handler.id, kind: "handler" as const, name: handler.name, appliedDaysAgo: handler.appliedDaysAgo,
      mobile: spaced(handler.mobile), station: handler.station,
      details: [["Platforms", handler.platforms], ["Shift", handler.shift]],
      checks: [
        { label: "Aadhaar", ok: handler.documents.aadhaar }, { label: "Photo", ok: handler.documents.photo },
        { label: "Police verification", ok: handler.documents.police }, { label: "Railway platform pass", ok: handler.documents.pass },
      ],
    }));

  const source = kind === "rider" ? riderCards : handlerCards;
  const stations = [...new Set(source.map((card) => card.station).filter((name) => name && name !== "—"))].sort();
  const term = search.trim().toLowerCase();
  const cards = source
    .filter((card) => station === "all" || card.station === station)
    .filter((card) => !term || card.name.toLowerCase().includes(term) || card.mobile.replace(/\s/g, "").includes(term.replace(/\s/g, "")));

  const decide = async (card: Card, approve: boolean) => {
    setError(null);
    if (card.kind === "handler") return setHandlerStatus(card.key, approve ? "active" : "inactive");
    setBusyKey(card.key);
    try {
      // The rider API only has ACTIVE and INACTIVE, so a rejected rider is set to INACTIVE.
      await updateRiderStatus({ id: card.key, status: approve ? "ACTIVE" : "INACTIVE" }).unwrap();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={setSearch} placeholder="Search name or mobile" />
      <SectionActions>
        <label className="td-select">
          <select value={station} onChange={(event) => setStation(event.target.value)} aria-label="Station">
            <option value="all">All stations</option>
            {stations.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
      </SectionActions>

      {error && <div className="api-state api-state--error" role="alert">{error}</div>}
      {ridersQuery.isError && <div className="api-state api-state--error" role="alert">Unable to load riders. {errorMessage(ridersQuery.error)}</div>}

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label="Approval type" value={kind} onChange={(value) => { setKind(value as Kind); setStation("all"); }}
            tabs={[{ id: "rider", label: "Riders", count: riderCards.length }, { id: "handler", label: "Handlers", count: handlerCards.length }]} />
        </div>
      </div>

      <div className="td-dp-grid">
        {cards.map((card) => {
          const missing = card.checks.filter((check) => !check.ok);
          const busy = busyKey === card.key;
          return (
            <article key={card.key} className="td-dp-card">
              <header>
                <InitialsAvatar name={card.name} imageUrl={card.imageUrl} size={40} />
                <span><strong>{card.name}</strong><small>{card.kind === "rider" ? "Rider" : "Handler"} · {applied(card.appliedDaysAgo)}</small></span>
                <i className={`td-dp-state${missing.length ? " is-warn" : ""}`}>{missing.length ? "Documents missing" : "Ready to review"}</i>
              </header>
              <dl>
                <div><dt>Mobile</dt><dd>{card.mobile}</dd></div>
                <div><dt>Station</dt><dd>{card.station}</dd></div>
                {card.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <ul className="td-dp-checks">
                {card.checks.map((check) => (
                  <li key={check.label} className={check.ok ? undefined : "is-missing"}>
                    <span aria-hidden="true">{check.ok ? "✓" : "✕"}</span>{check.ok ? check.label : `${check.label} missing`}
                  </li>
                ))}
              </ul>
              <footer>
                <button type="button" className="td-btn td-btn--small td-btn--reject" disabled={busy} onClick={() => void decide(card, false)}>Reject</button>
                <button type="button" className="td-view-link" onClick={() => setViewing(card)}>View</button>
                <button type="button" className="td-btn td-btn--small td-btn--approve" disabled={busy || missing.length > 0} data-tooltip={missing.length ? "Documents are missing, so this can't be approved yet." : undefined} onClick={() => void decide(card, true)}>Approve</button>
              </footer>
            </article>
          );
        })}
      </div>
      {!cards.length && !ridersQuery.isLoading && <div className="api-state">No {kind}s are waiting for approval.</div>}

      <SidePanel open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name ?? ""}
        header={viewing && <div className="td-ord-head"><h3>{viewing.name}</h3><p>{viewing.kind === "rider" ? "Rider" : "Handler"} · {applied(viewing.appliedDaysAgo)}</p></div>}
        footer={<button type="button" className="td-btn td-btn--small" onClick={() => setViewing(null)}>Close</button>}>
        {viewing && (
          <div className="td-ord-panel">
            <section>
              <h4>Details</h4>
              <dl>
                <div><dt>Mobile</dt><dd>{viewing.mobile}</dd></div>
                <div><dt>Station</dt><dd>{viewing.station}</dd></div>
                {viewing.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
            </section>
            <section>
              <h4>Documents</h4>
              <ul className="td-dp-checks td-dp-checks--one">
                {viewing.checks.map((check) => <li key={check.label} className={check.ok ? undefined : "is-missing"}><span aria-hidden="true">{check.ok ? "✓" : "✕"}</span>{check.ok ? check.label : `${check.label} missing`}</li>)}
              </ul>
              <p className="td-ord-muted"><Icon name="info" size={13} /> Document files can&apos;t be opened yet.</p>
            </section>
          </div>
        )}
      </SidePanel>
    </section>
  );
}
