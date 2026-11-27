"use client";

import { useState, type ReactNode } from "react";

import { PageFooter } from "../admin/components/PageFooter";
import { SectionActions, SectionSearch } from "../admin/components/SectionActions";
import { SidePanel } from "../admin/components/SidePanel";
import { StatusTabs } from "../admin/components/StatusTabs";
import { TransientSuccessMessage } from "../admin/components/TransientSuccessMessage";
import {
  AVERAGE_RATING, RATING_SHARE, STATIONS, replyToFeedbackComplaint, replyToReview, stationOfRestaurant, useFeedbackComplaints, useReviews,
  type ComplaintStatus, type FeedbackComplaint, type Review,
} from "./feedbackStore";

const PAGE_SIZE = 5;
const includes = (term: string, values: string[]) => !term || values.some((value) => value.toLowerCase().includes(term));

function ageLabel(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : weeks < 5 ? `${weeks} weeks ago` : `${Math.floor(days / 30) || 1} month${days >= 60 ? "s" : ""} ago`;
}

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="td-fb-stars" style={{ fontSize: size }} role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => <i key={star} className={star <= Math.round(value) ? "is-on" : undefined}>★</i>)}
    </span>
  );
}

function Selects({ station, onStation, children }: { station: string; onStation: (value: string) => void; children: ReactNode }) {
  return (
    <SectionActions>
      <label className="td-select"><select value={station} onChange={(event) => onStation(event.target.value)} aria-label="Station"><option value="all">All stations</option>{STATIONS.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      {children}
    </SectionActions>
  );
}

const sampleNote = <div className="api-state" role="note">Sample data: reviews and complaints aren&apos;t connected to the backend yet.</div>;

/* ------------------------------------------------------------------ reviews */

export function ReviewsView() {
  const reviews = useReviews();
  const [search, setSearch] = useState("");
  const [station, setStation] = useState("all");
  const [rating, setRating] = useState("all");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState<Review | null>(null);
  const [message, setMessage] = useState("");

  const term = search.trim().toLowerCase();
  const scoped = reviews.filter((review) => includes(term, [review.customer, review.restaurant, review.order]) && (station === "all" || review.station === station) && (rating === "all" || review.rating === Number(rating)));
  const waiting = scoped.filter((review) => !review.replied);
  const low = scoped.filter((review) => review.rating <= 2);
  const filtered = tab === "waiting" ? waiting : tab === "low" ? low : scoped;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const lowShare = RATING_SHARE[3] + RATING_SHARE[4];
  const allWaiting = reviews.filter((review) => !review.replied).length;

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search customer, restaurant or order" />
      <Selects station={station} onStation={(value) => { setStation(value); setPage(1); }}>
        <label className="td-select"><select value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }} aria-label="Rating"><option value="all">All ratings</option>{[5, 4, 3, 2, 1].map((star) => <option key={star} value={star}>{star} {star === 1 ? "star" : "stars"}</option>)}</select></label>
      </Selects>
      {sampleNote}
      <TransientSuccessMessage message={message} />

      <section className="td-fb-summary">
        <div className="td-fb-avg">
          <small>Average rating</small>
          <p><strong>{AVERAGE_RATING}</strong><span> / 5</span></p>
          <Stars value={AVERAGE_RATING} size={14} />
          <small>from 1,284 reviews this month</small>
        </div>
        <ul className="td-fb-dist" aria-label="Rating distribution">
          {[5, 4, 3, 2, 1].map((star, i) => (
            <li key={star}>
              <span>{star} ★</span>
              <i><u className={star >= 4 ? "is-good" : star === 3 ? "is-mid" : "is-bad"} style={{ width: `${RATING_SHARE[i]}%` }} /></i>
              <b>{RATING_SHARE[i]}%</b>
            </li>
          ))}
        </ul>
        <div className="td-fb-stats">
          <div><small>Waiting for reply</small><strong>{allWaiting}</strong></div>
          <div><small>Low ratings (1–2★)</small><strong className="td-an-bad">{lowShare}%</strong></div>
        </div>
      </section>

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label="Filter reviews" value={tab} onChange={(value) => { setTab(value); setPage(1); }}
            tabs={[{ id: "all", label: "All", count: scoped.length }, { id: "waiting", label: "Waiting for reply", count: waiting.length }, { id: "low", label: "Low ratings", count: low.length }]} />
        </div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Customer</th><th>Restaurant</th><th>Review</th><th>Date</th><th><span className="td-sr">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((review) => (
                <tr key={review.id}>
                  <td><div className="td-contact"><strong>{review.customer}</strong><small className="td-fb-order">{review.order}</small></div></td>
                  <td><div className="td-contact"><strong>{review.restaurant}</strong><small>{review.station}</small></div></td>
                  <td className="td-fb-review"><Stars value={review.rating} /><p>{review.text}</p></td>
                  <td className="td-muted">{ageLabel(review.daysAgo)}</td>
                  <td className="td-th-right">{review.replied ? <span className="td-faint">Replied</span> : <button type="button" className="td-outline-btn" onClick={() => setReplying(review)}>Reply</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="api-state">No reviews match.</div>}
        </div>
        {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun="reviews" onChange={setPage} />}
      </div>

      {replying && <ReplyPanel key={replying.id} title="Reply to review" subtitle={`${replying.customer} · ${replying.order}`} quote={replying.text} stars={replying.rating} onClose={() => setReplying(null)}
        onSend={(text) => { replyToReview(replying.id, text); setReplying(null); setMessage(`Your reply to ${replying.customer} was saved.`); }} />}
    </section>
  );
}

/* --------------------------------------------------------------- complaints */

const STATUS_TONE: Record<ComplaintStatus, string> = { Open: "bad", "In progress": "warn", Resolved: "ok" };

export function FeedbackComplaintsView() {
  const complaints = useFeedbackComplaints();
  const [search, setSearch] = useState("");
  const [station, setStation] = useState("all");
  const [status, setStatus] = useState("all");
  const [tab, setTab] = useState<"customer" | "restaurant">("customer");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FeedbackComplaint | null>(null);
  const [message, setMessage] = useState("");

  const term = search.trim().toLowerCase();
  const scoped = complaints.filter((item) => includes(term, [item.id, item.raisedBy, item.order, item.issue]) && (station === "all" || stationOfRestaurant(item.restaurant) === station) && (status === "all" || item.status === status));
  const filtered = scoped.filter((item) => item.kind === tab);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search complaint ID, name or order" />
      <Selects station={station} onStation={(value) => { setStation(value); setPage(1); }}>
        <label className="td-select"><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Status"><option value="all">All statuses</option>{(["Open", "In progress", "Resolved"] as const).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </Selects>
      {sampleNote}
      <TransientSuccessMessage message={message} />

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label="Complaint source" value={tab} onChange={(value) => { setTab(value as "customer" | "restaurant"); setPage(1); }}
            tabs={[{ id: "customer", label: "From customers", count: scoped.filter((item) => item.kind === "customer").length }, { id: "restaurant", label: "From restaurants", count: scoped.filter((item) => item.kind === "restaurant").length }]} />
        </div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead><tr><th>Complaint</th><th>Raised by</th><th>Issue</th><th>Status</th><th><span className="td-sr">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td><div className="td-contact"><strong>{item.id}</strong><small>{item.date}</small></div></td>
                  <td><strong>{item.raisedBy}</strong></td>
                  <td><div className="td-contact"><span>{item.issue}</span><small>{item.order} · {item.restaurant}</small></div></td>
                  <td><span className={`td-ord-status td-ord-status--${STATUS_TONE[item.status]}`}>{item.status}</span></td>
                  <td className="td-th-right">
                    {item.status === "Resolved"
                      ? <button type="button" className="td-view-link" onClick={() => setSelected(item)}>View</button>
                      : <button type="button" className="td-outline-btn" onClick={() => setSelected(item)}>Reply</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="api-state">No complaints match.</div>}
        </div>
        {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun="complaints" onChange={setPage} />}
      </div>

      {selected && (
        <ReplyPanel key={selected.id} title={selected.id} subtitle={`${selected.raisedBy} · ${selected.date}`} heading={selected.issue} quote={selected.detail} meta={`${selected.order} · ${selected.restaurant}`}
          existing={selected.reply} readOnly={selected.status === "Resolved"} canResolve onClose={() => setSelected(null)}
          onSend={(text, resolve) => { replyToFeedbackComplaint(selected.id, text, resolve); setSelected(null); setMessage(resolve ? `${selected.id} was marked resolved.` : `Your reply on ${selected.id} was saved.`); }} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------- reply panel */

function ReplyPanel({ title, subtitle, heading, quote, meta, stars, existing, readOnly, canResolve, onClose, onSend }: {
  title: string; subtitle: string; heading?: string; quote: string; meta?: string; stars?: number; existing?: string; readOnly?: boolean; canResolve?: boolean;
  onClose: () => void; onSend: (text: string, resolve: boolean) => void;
}) {
  const [text, setText] = useState(existing ?? "");
  const [error, setError] = useState("");
  const send = (resolve: boolean) => { if (!text.trim()) return setError("Write a reply first."); onSend(text.trim(), resolve); };
  return (
    <SidePanel open onClose={onClose} title={title} description={subtitle}
      footer={readOnly
        ? <button type="button" className="td-btn td-btn--small" onClick={onClose}>Close</button>
        : <>
            <button type="button" className="td-btn td-btn--small" onClick={onClose}>Cancel</button>
            {canResolve && <button type="button" className="td-btn td-btn--small" onClick={() => send(true)}>Send and resolve</button>}
            <button type="button" className="td-btn td-btn--primary td-btn--small" onClick={() => send(false)}>Send reply</button>
          </>}>
      <div className="td-fb-reply">
        {heading && <h4>{heading}</h4>}
        {stars != null && <Stars value={stars} size={14} />}
        <blockquote>{quote}</blockquote>
        {meta && <small>{meta}</small>}
        <label className="td-menu-field">
          <span>{readOnly ? "Reply" : "Your reply"}</span>
          <textarea rows={5} value={text} onChange={(event) => { setText(event.target.value); setError(""); }} readOnly={readOnly} maxLength={500} placeholder={readOnly ? "No reply was recorded." : "Write your reply"} />
          {error && <small className="td-field-error">{error}</small>}
        </label>
      </div>
    </SidePanel>
  );
}
