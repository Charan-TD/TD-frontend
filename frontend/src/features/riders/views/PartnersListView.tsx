"use client";

import { useState } from "react";

import { Icon } from "../../admin/components/Icon";
import { InitialsAvatar } from "../../admin/components/InitialsAvatar";
import { PageFooter } from "../../admin/components/PageFooter";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { SkeletonTable } from "../../admin/components/Skeleton";
import { StatusSwitch } from "../../admin/components/StatusSwitch";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { errorMessage } from "../../admin/views/approvalShared";
import { useGetAllRidersQuery, useUpdateRiderStatusMutation, type Rider } from "../api/ridersApi";
import { setHandlerStatus, useHandlers } from "../viewmodels/handlersStore";
import { AddPartnerPanel } from "./AddPartnerPanel";

const PAGE_SIZE = 10;
type Filter = "all" | "active" | "inactive";

/** One row, whichever kind of partner it came from. */
type Row = {
  key: string;
  name: string;
  code: string;
  imageUrl?: string | null;
  mobile: string;
  vehicleNumber: string;
  station: string;
  platforms: string;
  shift: string;
  rating: string;
  active: boolean;
  /** Pending partners are reviewed on the Approvals page instead. */
  pending: boolean;
};

const statusOf = (rider: Rider) => String(rider.status ?? "").toUpperCase();
const dash = (value: string | null | undefined) => (value && value.trim() ? value : "—");
const spaced = (mobile: string | null | undefined) => (mobile && /^\d{10}$/.test(mobile) ? `${mobile.slice(0, 5)} ${mobile.slice(5)}` : dash(mobile));

const riderRow = (rider: Rider): Row => ({
  key: rider.id,
  name: rider.full_name ?? "—",
  code: `RD-${rider.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`,
  imageUrl: rider.profile_image_url,
  mobile: spaced(rider.phone),
  vehicleNumber: dash(rider.vehicle_number),
  station: "—",
  platforms: "",
  shift: "",
  rating: "—",
  active: statusOf(rider) === "ACTIVE",
  pending: statusOf(rider) === "PENDING",
});

export function PartnersListView({ kind, onReview }: { kind: "rider" | "handler"; onReview: () => void }) {
  const handlers = kind === "handler";
  const ridersQuery = useGetAllRidersQuery(undefined, { skip: handlers });
  const [updateRiderStatus] = useUpdateRiderStatusMutation();
  const handlerData = useHandlers();

  const [search, setSearch] = useState("");
  const [station, setStation] = useState("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const all: Row[] = handlers
    ? handlerData.map((handler) => ({
        key: handler.id, name: handler.name, code: handler.id, mobile: spaced(handler.mobile), vehicleNumber: "", station: handler.station,
        platforms: handler.platforms, shift: handler.shift, rating: "", active: handler.status === "active", pending: handler.status === "pending",
      }))
    : (ridersQuery.data ?? []).map(riderRow);
  const pendingCount = all.filter((row) => row.pending).length;
  const listed = all.filter((row) => !row.pending);

  const stations = [...new Set(listed.map((row) => row.station).filter((name) => name && name !== "—"))].sort();
  const term = search.trim().toLowerCase();
  const scoped = listed
    .filter((row) => station === "all" || row.station === station)
    .filter((row) => !term || [row.name, row.code, row.mobile, row.vehicleNumber].some((value) => value.toLowerCase().includes(term)));
  const counts = { all: scoped.length, active: scoped.filter((row) => row.active).length, inactive: scoped.filter((row) => !row.active).length };
  const filtered = scoped.filter((row) => filter === "all" || (filter === "active" ? row.active : !row.active));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const toggle = async (row: Row) => {
    setError(null);
    if (handlers) return setHandlerStatus(row.key, row.active ? "inactive" : "active");
    setBusyKey(row.key);
    try {
      await updateRiderStatus({ id: row.key, status: row.active ? "INACTIVE" : "ACTIVE" }).unwrap();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const noun = handlers ? "handler" : "rider";
  const loading = !handlers && ridersQuery.isLoading;
  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={handlers ? "Search name, ID or mobile" : "Search name, ID, mobile or vehicle number"} />
      <SectionActions>
        <label className="td-select">
          <select value={station} onChange={(event) => { setStation(event.target.value); setPage(1); }} aria-label="Station">
            <option value="all">All stations</option>
            {stations.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button type="button" className="td-btn td-btn--primary" onClick={() => setAdding(true)}><Icon name="plus" size={14} />Add {noun}</button>
      </SectionActions>

      <TransientSuccessMessage message={message} />
      {error && <div className="api-state api-state--error" role="alert">{error}</div>}
      {!handlers && ridersQuery.isError && <div className="api-state api-state--error" role="alert">Unable to load riders. {errorMessage(ridersQuery.error)}</div>}

      {pendingCount > 0 && (
        <div className="td-banner td-dp-banner" role="status">
          <span className="td-banner-icon"><Icon name="info" size={15} /></span>
          <p><b>{pendingCount} new {noun}s waiting for approval.</b> They can&apos;t take deliveries until you approve them.</p>
          <button type="button" className="td-view-link" onClick={onReview}>Review ›</button>
        </div>
      )}

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label={`Filter ${noun}s by status`} value={filter} onChange={(value) => { setFilter(value as Filter); setPage(1); }}
            tabs={[{ id: "all", label: `All ${noun}s`, count: counts.all }, { id: "active", label: "Active", count: counts.active }, { id: "inactive", label: "Inactive", count: counts.inactive }]} />
        </div>

        {loading && <SkeletonTable columns={handlers ? ["Handler", "Mobile", "Station · Platforms", "Shift", "Status"] : ["Rider", "Mobile", "Vehicle number", "Station", "Rating", "Status"]} />}

        {!loading && (
          <>
            <div className="td-table-scroll">
              <table className="td-table">
                <thead>
                  <tr>
                    <th>{handlers ? "Handler" : "Rider"}</th><th>Mobile</th>
                    {handlers ? <><th>Station · Platforms</th><th>Shift</th></> : <><th>Vehicle number</th><th>Station</th><th>Rating</th></>}
                    <th>Status</th><th><span className="td-sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key}>
                      <td><div className="td-member"><InitialsAvatar name={row.name} imageUrl={row.imageUrl} size={36} /><span><strong>{row.name}</strong><small>{row.code}</small></span></div></td>
                      <td className="td-muted">{row.mobile}</td>
                      {handlers ? (
                        <><td><div className="td-contact"><span>{row.station}</span><small>{row.platforms}</small></div></td><td className="td-muted">{row.shift}</td></>
                      ) : (
                        <><td className="td-muted">{row.vehicleNumber}</td><td className="td-muted">{row.station}</td><td className={row.rating === "—" ? "td-faint" : undefined}>{row.rating === "—" ? "—" : `★ ${row.rating}`}</td></>
                      )}
                      <td><StatusSwitch checked={row.active} onLabel="On" offLabel="Off" label={`${row.active ? "Turn off" : "Turn on"} ${row.name}`} disabled={busyKey === row.key} onChange={() => void toggle(row)} /></td>
                      <td className="td-th-right"><button type="button" className="td-icon-btn" aria-label={`Edit ${row.name}`} disabled data-tooltip={`Editing ${noun}s isn't available yet.`}><Icon name="edit" size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div className="api-state">No {noun}s found.</div>}
            </div>
            {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun={`${noun}s`} onChange={setPage} />}
          </>
        )}
      </div>

      {adding && <AddPartnerPanel kind={kind} onClose={() => setAdding(false)} onSaved={(name) => { setAdding(false); setMessage(`${name} was added.`); }} />}
    </section>
  );
}
