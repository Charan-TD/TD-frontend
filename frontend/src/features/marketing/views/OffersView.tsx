"use client";

import { useState, type ReactNode } from "react";

import { Icon } from "../../admin/components/Icon";
import { PageFooter } from "../../admin/components/PageFooter";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { SidePanel } from "../../admin/components/SidePanel";
import { StatusSwitch } from "../../admin/components/StatusSwitch";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { phaseOf, savePromo, setPromoEnabled, useCoupons, useOffers, type Offer, type Phase, type PromoKind } from "../viewmodels/marketingStore";

const PAGE_SIZE = 10;
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const inputDate = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

type Form = { name: string; note: string; discount: string; appliesTo: string; shownOn: string; start: string; end: string; enabled: boolean };
const blank = (): Form => ({ name: "", note: "", discount: "", appliesTo: "All restaurants", shownOn: "Home banner", start: "", end: "", enabled: true });
const toForm = (offer: Offer): Form => ({ name: offer.name, note: offer.note, discount: offer.discount, appliesTo: offer.appliesTo, shownOn: offer.shownOn, start: inputDate(offer.start), end: inputDate(offer.end), enabled: offer.enabled });

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="td-menu-field">
      <span>{label}<em> *</em></span>
      {children}
      {error && <small className="td-field-error">{error}</small>}
    </label>
  );
}

/** Offers and coupons share one layout; only the wording and the data differ. */
export function OffersView({ kind = "offer" }: { kind?: PromoKind }) {
  const coupon = kind === "coupon";
  const noun = coupon ? "coupon" : "offer";
  const offerList = useOffers();
  const couponList = useCoupons();
  const offers = coupon ? couponList : offerList;
  const [now] = useState(() => Date.now());
  const [phase, setPhase] = useState<Phase>("live");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const [panel, setPanel] = useState<{ offer: Offer | null } | null>(null);

  const term = search.trim().toLowerCase();
  const scoped = offers.filter((offer) => !term || [offer.name, offer.note, offer.discount, offer.appliesTo, offer.shownOn].some((value) => value.toLowerCase().includes(term)));
  const counts = { live: 0, scheduled: 0, ended: 0 };
  scoped.forEach((offer) => { counts[phaseOf(offer, now)] += 1; });
  const filtered = scoped.filter((offer) => phaseOf(offer, now) === phase);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={`Search ${noun}s`} />
      <SectionActions>
        <button type="button" className="td-btn td-btn--primary" onClick={() => setPanel({ offer: null })}><Icon name="plus" size={14} />Create {noun}</button>
      </SectionActions>

      <TransientSuccessMessage message={message} />

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label={`Filter ${noun}s`} value={phase} onChange={(value) => { setPhase(value as Phase); setPage(1); }}
            tabs={[{ id: "live", label: "Live", count: counts.live }, { id: "scheduled", label: "Scheduled", count: counts.scheduled }, { id: "ended", label: "Ended", count: counts.ended }]} />
        </div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead>
              <tr><th>{coupon ? "Coupon" : "Offer"}</th><th>Discount</th><th>Applies to · Shown on</th><th>Valid</th><th className="td-th-right">Used</th><th>Status</th><th><span className="td-sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((offer) => (
                <tr key={offer.id}>
                  <td>
                    <div className="td-member">
                      <span className={`td-mk-tile td-mk-tone-${offer.tone % 5}`}><Icon name="image" size={16} /></span>
                      <span><strong className={coupon ? "td-mk-code" : undefined}>{offer.name}</strong><small>{offer.note}</small></span>
                    </div>
                  </td>
                  <td><strong className="td-normal">{offer.discount}</strong></td>
                  <td><div className="td-contact"><span>{offer.appliesTo}</span><small>{offer.shownOn}</small></div></td>
                  <td className="td-muted">{dayMonth(offer.start)} – {dayMonth(offer.end)}</td>
                  <td className="td-num td-muted">{offer.used == null ? "—" : `${offer.used.toLocaleString("en-IN")} orders`}</td>
                  <td><StatusSwitch checked={offer.enabled} onLabel="On" offLabel="Off" label={`${offer.enabled ? "Turn off" : "Turn on"} ${offer.name}`} onChange={(next) => setPromoEnabled(kind, offer.id, next)} /></td>
                  <td className="td-th-right"><button type="button" className="td-icon-btn" aria-label={`Edit ${offer.name}`} onClick={() => setPanel({ offer })}><Icon name="edit" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="api-state">{term ? `No ${noun}s match your search.` : `No ${phase} ${noun}s.`}</div>}
        </div>
        {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun={`${noun}s`} onChange={setPage} />}
      </div>

      {panel && <OfferPanel key={panel.offer?.id ?? "new"} kind={kind} offer={panel.offer} onClose={() => setPanel(null)} onSaved={(text) => { setPanel(null); setMessage(text); }} />}
    </section>
  );
}

function OfferPanel({ kind, offer, onClose, onSaved }: { kind: PromoKind; offer: Offer | null; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<Form>(() => (offer ? toForm(offer) : blank()));
  const [showErrors, setShowErrors] = useState(false);
  const coupon = kind === "coupon";
  const noun = coupon ? "coupon" : "offer";
  const set = (key: keyof Form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: key === "name" && coupon ? event.target.value.toUpperCase().replace(/s/g, "") : event.target.value });

  const errors: Partial<Record<keyof Form, string>> = {};
  if (!form.name.trim()) errors.name = coupon ? "Enter the coupon code." : "Enter the offer name.";
  if (!form.discount.trim()) errors.discount = "Enter the discount, e.g. 20% up to ₹100.";
  if (!form.start) errors.start = "Choose the start date.";
  if (!form.end) errors.end = "Choose the end date.";
  else if (form.start && form.end < form.start) errors.end = "The end can't be before the start.";
  const show = (key: keyof Form) => (showErrors ? errors[key] : undefined);

  const submit = () => {
    if (Object.keys(errors).length) return setShowErrors(true);
    savePromo(kind, {
      id: offer?.id, name: form.name.trim(), note: form.note.trim(), discount: form.discount.trim(), appliesTo: form.appliesTo.trim() || "All restaurants", shownOn: form.shownOn.trim() || "Home banner",
      start: new Date(`${form.start}T00:00:00`).toISOString(), end: new Date(`${form.end}T23:59:00`).toISOString(), enabled: form.enabled,
    });
    onSaved(`${form.name.trim()} was ${offer ? "updated" : "created"}.`);
  };

  return (
    <SidePanel open onClose={onClose} title={offer ? `Edit ${noun}` : `Create ${noun}`} description={coupon ? "Customers enter the code at checkout." : "Customers see live offers on the pages you choose."}
      footer={<><button type="button" className="td-btn td-btn--small" onClick={onClose}>Cancel</button><button type="button" className="td-btn td-btn--primary td-btn--small" onClick={submit}>{offer ? "Save changes" : `Create ${noun}`}</button></>}>
      <div className="td-st-form">
        <Field label={coupon ? "Coupon code" : "Offer name"} error={show("name")}><input value={form.name} onChange={set("name")} placeholder={coupon ? "e.g. TRAIN50" : "e.g. 20% off biryani"} maxLength={coupon ? 20 : 80} /></Field>
        <label className="td-menu-field"><span>Who it&apos;s for</span><input value={form.note} onChange={set("note")} placeholder="e.g. New users only" maxLength={80} /></label>
        <Field label="Discount" error={show("discount")}><input value={form.discount} onChange={set("discount")} placeholder="e.g. 20% up to ₹100" maxLength={60} /></Field>
        <div className="td-st-row">
          <label className="td-menu-field"><span>Applies to</span><input value={form.appliesTo} onChange={set("appliesTo")} placeholder="All restaurants" maxLength={80} /></label>
          <label className="td-menu-field"><span>Shown on</span><input value={form.shownOn} onChange={set("shownOn")} placeholder="Home banner" maxLength={80} /></label>
        </div>
        <div className="td-st-row">
          <Field label="Start date" error={show("start")}><input type="date" value={form.start} onChange={set("start")} /></Field>
          <Field label="End date" error={show("end")}><input type="date" value={form.end} onChange={set("end")} /></Field>
        </div>
        <div className="td-st-status">
          <div><b>Status</b><small>{coupon ? "Off coupons can't be used" : "Off offers are not shown to customers"}</small></div>
          <StatusSwitch checked={form.enabled} onLabel="On" offLabel="Off" label={`${coupon ? "Coupon" : "Offer"} status`} onChange={(next) => setForm({ ...form, enabled: next })} />
        </div>
      </div>
    </SidePanel>
  );
}
