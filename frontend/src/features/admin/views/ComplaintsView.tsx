"use client";

import { useState } from "react";

import { Icon } from "../components/Icon";
import { InitialsAvatar } from "../components/InitialsAvatar";
import { PageFooter } from "../components/PageFooter";
import { SectionSearch } from "../components/SectionActions";
import { SidePanel } from "../components/SidePanel";
import { StatusTabs } from "../components/StatusTabs";
import { TransientSuccessMessage } from "../components/TransientSuccessMessage";
import { complaintStatusLabel, type Complaint, type ComplaintStatus } from "../models/complaints";
import { replyToComplaint, useComplaints } from "../viewmodels/complaintsStore";
import { shortDate } from "../viewmodels/userOrders";

const PAGE_SIZE = 8;
type Filter = "all" | ComplaintStatus;

export function ComplaintsView() {
  const complaints = useComplaints();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<Complaint | null>(null);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");

  const count = (status: ComplaintStatus) => complaints.filter((c) => c.status === status).length;
  const needle = search.trim().toLowerCase();
  const filtered = complaints.filter((c) =>
    (filter === "all" || c.status === filter) &&
    (!needle || [c.id, c.subject, c.customerName].some((v) => v.toLowerCase().includes(needle))));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const open = (complaint: Complaint) => { setActive(complaint); setReply(complaint.reply ?? ""); };
  const close = () => { setActive(null); setReply(""); };
  const send = () => {
    if (!active || !reply.trim()) return;
    replyToComplaint(active.id, reply.trim());
    setMessage(`Reply sent to ${active.customerName}.`);
    close();
  };

  const tiles: { label: string; value: number; tone: string }[] = [
    { label: "Total complaints", value: complaints.length, tone: "neutral" },
    { label: "Open", value: count("open"), tone: "danger" },
    { label: "In progress", value: count("in_progress"), tone: "info" },
    { label: "Resolved", value: count("resolved"), tone: "success" },
  ];

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search complaints by ID, subject or customer" />
      <TransientSuccessMessage message={message} />

      <div className="td-stats">
        {tiles.map((tile) => (
          <div key={tile.label} className="td-stat td-stat--static">
            <span className={`td-stat-icon td-dot-icon td-dot-icon--${tile.tone}`}><i /></span>
            <span className="td-stat-body"><strong>{tile.value}</strong><small>{tile.label}</small></span>
          </div>
        ))}
      </div>

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label="Filter complaints by status" value={filter} onChange={(v) => { setFilter(v as Filter); setPage(1); }}
            tabs={[{ id: "all", label: "All", count: complaints.length }, { id: "open", label: "Open", count: count("open") }, { id: "in_progress", label: "In progress", count: count("in_progress") }, { id: "resolved", label: "Resolved", count: count("resolved") }]} />
        </div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Complaint</th><th>Raised by</th><th>Date</th><th className="td-th-right">Action</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><div className="td-member"><span><strong>{c.subject}</strong><small>{c.id}</small></span></div></td>
                  <td><div className="td-member"><InitialsAvatar name={c.customerName} size={28} /><span><strong className="td-normal">{c.customerName}</strong></span></div></td>
                  <td className="td-muted">{shortDate(c.raisedAt, true)}</td>
                  <td className="td-th-right"><button type="button" className="td-outline-btn" onClick={() => open(c)}>{c.status === "resolved" ? "View" : "Reply"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="api-state">No complaints found.</div>}
        </div>
        {rows.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun="complaints" onChange={setPage} />}
      </div>

      {active && (
        <SidePanel
          open
          onClose={close}
          title={active.subject}
          header={(
            <div className="td-complaint-head">
              <small>{active.id}</small>
              <h3>{active.subject}</h3>
              <p>Raised by <b>{active.customerName}</b> · Customer{active.orderNumber ? ` · Order #${active.orderNumber}` : ""} · {shortDate(active.raisedAt, true)}</p>
            </div>
          )}
          footer={active.status === "resolved"
            ? <button type="button" className="td-btn" onClick={close}>Close</button>
            : (<>
                <button type="button" className="td-btn" onClick={close}>Cancel</button>
                <button type="button" className="td-btn td-btn--primary" disabled={!reply.trim()} onClick={send}><Icon name="arrow-right" size={14} />Send reply</button>
              </>)}
        >
          <div className="td-complaint-box"><small>Complaint</small><p>{active.description}</p></div>
          <label className="td-complaint-reply">
            <span>{active.status === "resolved" ? "Status" : "Your reply"}</span>
            {active.status === "resolved"
              ? <p>{complaintStatusLabel[active.status]}{active.reply ? ` — ${active.reply}` : ""}</p>
              : <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Write a reply to ${active.customerName}...`} rows={6} />}
          </label>
        </SidePanel>
      )}
    </section>
  );
}
