"use client";

import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { Icon } from "../../admin/components/Icon";
import { PageFooter } from "../../admin/components/PageFooter";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { StatusSwitch } from "../../admin/components/StatusSwitch";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { useGetAllOrdersQuery } from "../../orders/api/ordersApi";
import { useGetAllRestaurantsQuery } from "../../restaurants/api/restaurantsApi";
import { BANNER_COLOURS, phaseOf, saveCampaign, setCampaignEnabled, useCampaigns, type Campaign, type Phase } from "../viewmodels/marketingStore";

const PAGE_SIZE = 10;
const HEADLINE_MAX = 60;
const BUTTON_MAX = 20;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const dayMonth = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const localInput = (iso: string) => { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

export function CampaignsView() {
  const [editing, setEditing] = useState<{ campaign: Campaign | null } | null>(null);
  const [message, setMessage] = useState("");

  if (editing) {
    return <CampaignForm key={editing.campaign?.id ?? "new"} campaign={editing.campaign} onBack={() => setEditing(null)} onSaved={(text) => { setEditing(null); setMessage(text); }} />;
  }
  return <CampaignList message={message} onEdit={(campaign) => { setMessage(""); setEditing({ campaign }); }} />;
}

function CampaignList({ message, onEdit }: { message: string; onEdit: (campaign: Campaign | null) => void }) {
  const campaigns = useCampaigns();
  const [now] = useState(() => Date.now());
  const [phase, setPhase] = useState<Phase>("live");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const term = search.trim().toLowerCase();
  const scoped = campaigns.filter((campaign) => !term || [campaign.headline, campaign.buttonText, campaign.stations].some((value) => value.toLowerCase().includes(term)));
  const counts = { live: 0, scheduled: 0, ended: 0 };
  scoped.forEach((campaign) => { counts[phaseOf(campaign, now)] += 1; });
  const filtered = scoped.filter((campaign) => phaseOf(campaign, now) === phase);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search campaigns" />
      <SectionActions>
        <button type="button" className="td-btn td-btn--primary" onClick={() => onEdit(null)}><Icon name="plus" size={14} />New campaign</button>
      </SectionActions>

      <TransientSuccessMessage message={message} />

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label="Filter campaigns" value={phase} onChange={(value) => { setPhase(value as Phase); setPage(1); }}
            tabs={[{ id: "live", label: "Live", count: counts.live }, { id: "scheduled", label: "Scheduled", count: counts.scheduled }, { id: "ended", label: "Ended", count: counts.ended }]} />
        </div>
        <div className="td-table-scroll">
          <table className="td-table">
            <thead>
              <tr><th>Campaign banner</th><th>Restaurants</th><th>Duration</th><th className="td-th-right">Views</th><th className="td-th-right">Orders</th><th>Status</th><th><span className="td-sr">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((campaign) => (
                <tr key={campaign.id}>
                  <td>
                    <div className="td-member">
                      <span className="td-mk-banner" style={{ background: campaign.colour }}><span>{campaign.headline}</span></span>
                      <span><strong>{campaign.headline}</strong><small>Button: {campaign.buttonText}</small></span>
                    </div>
                  </td>
                  <td><div className="td-contact"><span>{campaign.restaurantCount} restaurants</span><small>{campaign.stations}</small></div></td>
                  <td className="td-muted">{dayMonth(campaign.start)} – {dayMonth(campaign.end)}</td>
                  <td><span className="td-mk-views"><span>{campaign.views == null ? "—" : campaign.views.toLocaleString("en-IN")}</span><small>views</small></span></td>
                  <td><span className="td-mk-views"><span>{campaign.orders == null ? "—" : campaign.orders.toLocaleString("en-IN")}</span><small>orders</small></span></td>
                  <td><StatusSwitch checked={campaign.enabled} onLabel="On" offLabel="Off" label={`${campaign.enabled ? "Turn off" : "Turn on"} ${campaign.headline}`} onChange={(next) => setCampaignEnabled(campaign.id, next)} /></td>
                  <td className="td-th-right"><button type="button" className="td-icon-btn" aria-label={`Edit ${campaign.headline}`} onClick={() => onEdit(campaign)}><Icon name="edit" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="api-state">{term ? "No campaigns match your search." : `No ${phase} campaigns.`}</div>}
        </div>
        {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun="campaigns" onChange={setPage} />}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* New / edit campaign                                                 */
/* ------------------------------------------------------------------ */

type Form = { headline: string; buttonText: string; colour: string; imageName: string; info: string; terms: string; restaurantIds: string[]; start: string; end: string };

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="td-cp-card"><h3>{title}</h3><p>{subtitle}</p>{children}</section>;
}

function Label({ text, aside }: { text: string; aside?: ReactNode }) {
  return <span className="td-cp-label"><span>{text}<em> *</em></span>{aside && <small>{aside}</small>}</span>;
}

function CampaignForm({ campaign, onBack, onSaved }: { campaign: Campaign | null; onBack: () => void; onSaved: (message: string) => void }) {
  const restaurantsQuery = useGetAllRestaurantsQuery();
  const ordersQuery = useGetAllOrdersQuery();
  const [form, setForm] = useState<Form>(() => campaign
    ? { headline: campaign.headline, buttonText: campaign.buttonText, colour: campaign.colour, imageName: campaign.imageName, info: campaign.info, terms: campaign.terms, restaurantIds: campaign.restaurantIds, start: localInput(campaign.start), end: localInput(campaign.end) }
    : { headline: "", buttonText: "", colour: BANNER_COLOURS[0], imageName: "", info: "", terms: "", restaurantIds: [], start: "", end: "" });
  const [imageNote, setImageNote] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [stationFilter, setStationFilter] = useState("all");
  const [showErrors, setShowErrors] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  /** The station each restaurant delivers to most often, taken from its orders. */
  const stationOf = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    (ordersQuery.data ?? []).forEach((order) => {
      if (!order.restaurant_id || !order.delivery_station_name) return;
      const perStation = counts.get(order.restaurant_id) ?? new Map<string, number>();
      perStation.set(order.delivery_station_name, (perStation.get(order.delivery_station_name) ?? 0) + 1);
      counts.set(order.restaurant_id, perStation);
    });
    return (id: string) => [...(counts.get(id) ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  }, [ordersQuery.data]);

  const restaurants = restaurantsQuery.data ?? [];
  const stationNames = [...new Set(restaurants.map((restaurant) => stationOf(restaurant.id)).filter(Boolean))].sort();
  const term = restaurantSearch.trim().toLowerCase();
  const visible = restaurants.filter((restaurant) => (!term || restaurant.name.toLowerCase().includes(term)) && (stationFilter === "all" || stationOf(restaurant.id) === stationFilter));

  const set = (key: keyof Form) => (event: { target: { value: string } }) => setForm({ ...form, [key]: event.target.value });
  const toggle = (id: string) => setForm({ ...form, restaurantIds: form.restaurantIds.includes(id) ? form.restaurantIds.filter((item) => item !== id) : [...form.restaurantIds, id] });

  const chooseImage = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (picked.type !== "image/png") return setImageNote("Choose a PNG image.");
    if (picked.size > MAX_IMAGE_BYTES) return setImageNote("Up to 2 MB.");
    setImageNote("");
    setForm({ ...form, imageName: picked.name });
  };

  const errors: Partial<Record<keyof Form, string>> = {};
  if (!form.headline.trim()) errors.headline = "Enter the headline.";
  if (!form.buttonText.trim()) errors.buttonText = "Enter the button text.";
  if (!form.imageName) errors.imageName = "Add the banner image.";
  if (!form.info.trim()) errors.info = "Enter the campaign info.";
  if (!form.terms.trim()) errors.terms = "Enter the terms and conditions.";
  if (!form.restaurantIds.length) errors.restaurantIds = "Select at least one restaurant.";
  if (!form.start) errors.start = "Choose the start.";
  if (!form.end) errors.end = "Choose the end.";
  else if (form.start && form.end <= form.start) errors.end = "The end must be after the start.";
  const show = (key: keyof Form) => (showErrors ? errors[key] : undefined);

  const submit = (publish: boolean) => {
    // A draft only needs a headline; publishing needs everything.
    if (publish ? Object.keys(errors).length : errors.headline) return setShowErrors(true);
    const chosen = restaurants.filter((restaurant) => form.restaurantIds.includes(restaurant.id));
    const names = [...new Set(chosen.map((restaurant) => stationOf(restaurant.id)).filter(Boolean))];
    const now = new Date();
    const day = 86_400_000;
    saveCampaign({
      id: campaign?.id, headline: form.headline.trim(), buttonText: form.buttonText.trim(), colour: form.colour, imageName: form.imageName, info: form.info.trim(), terms: form.terms.trim(),
      restaurantIds: form.restaurantIds, restaurantCount: form.restaurantIds.length || campaign?.restaurantCount || 0, stations: names.length === 0 ? "All stations" : names.length <= 2 ? names.join(", ") : `${names.length} stations`,
      start: new Date(form.start || now.getTime()).toISOString(), end: new Date(form.end || now.getTime() + 30 * day).toISOString(), enabled: publish,
    });
    onSaved(publish ? `${form.headline.trim()} was published.` : `${form.headline.trim()} was saved as a draft.`);
  };

  return (
    <section className="td-page td-cp">
      <header className="td-cp-head">
        <nav aria-label="Breadcrumb"><button type="button" onClick={onBack}>‹ Campaigns</button><span>/</span><b>{campaign ? "Edit campaign" : "New campaign"}</b></nav>
        <div>
          <button type="button" className="td-btn" onClick={() => submit(false)}>Save as draft</button>
          <button type="button" className="td-btn td-btn--primary" onClick={() => submit(true)}>Publish campaign</button>
        </div>
      </header>

      <div className="td-cp-grid">
        <div className="td-cp-col">
          <Card title="Banner" subtitle="What customers see on the home screen.">
            <label className="td-cp-field">
              <Label text="Headline" aside={`${form.headline.length} / ${HEADLINE_MAX}`} />
              <input value={form.headline} onChange={set("headline")} maxLength={HEADLINE_MAX} placeholder="e.g. 60% off on your first order" />
              {show("headline") && <small className="td-field-error">{errors.headline}</small>}
            </label>
            <div className="td-cp-pair">
              <label className="td-cp-field">
                <Label text="Button text" aside={`${form.buttonText.length} / ${BUTTON_MAX}`} />
                <input value={form.buttonText} onChange={set("buttonText")} maxLength={BUTTON_MAX} placeholder="e.g. Start ordering" />
                {show("buttonText") && <small className="td-field-error">{errors.buttonText}</small>}
              </label>
              <div className="td-cp-field">
                <Label text="Background colour" />
                <div className="td-cp-swatches" role="radiogroup" aria-label="Background colour">
                  {BANNER_COLOURS.map((colour) => (
                    <button key={colour} type="button" role="radio" aria-checked={form.colour === colour} aria-label={colour} className={form.colour === colour ? "is-selected" : undefined} style={{ background: colour }} onClick={() => setForm({ ...form, colour })} />
                  ))}
                </div>
              </div>
            </div>
            <div className="td-cp-field">
              <Label text="Banner image" />
              <div className="td-cp-image">
                <span className="td-cp-image-icon"><Icon name="image" size={20} /></span>
                <span><b>{form.imageName || "No image yet"}</b><small className={imageNote ? "is-error" : undefined}>{imageNote || "PNG with transparent background · 600 × 600 px"}</small></span>
                <button type="button" className="td-btn td-btn--small" onClick={() => picker.current?.click()}>{form.imageName ? "Change" : "Upload"}</button>
                <input ref={picker} type="file" accept="image/png" hidden onChange={chooseImage} />
              </div>
              {show("imageName") && <small className="td-field-error">{errors.imageName}</small>}
            </div>
          </Card>

          <Card title="Campaign page" subtitle="Shown when customers tap the banner.">
            <label className="td-cp-field">
              <Label text="Campaign info" aside={"Opens from “Read more”"} />
              <textarea rows={3} value={form.info} onChange={set("info")} placeholder="Describe the offer for customers" />
              {show("info") && <small className="td-field-error">{errors.info}</small>}
            </label>
            <label className="td-cp-field">
              <Label text="Terms & conditions" />
              <textarea rows={3} value={form.terms} onChange={set("terms")} placeholder="Add the rules that apply" />
              {show("terms") && <small className="td-field-error">{errors.terms}</small>}
            </label>
          </Card>
        </div>

        <div className="td-cp-col">
          <Card title="Restaurants" subtitle="Restaurants listed on the campaign page.">
            <label className="td-cp-search"><Icon name="search" size={15} /><input value={restaurantSearch} onChange={(event) => setRestaurantSearch(event.target.value)} placeholder="Search restaurant" aria-label="Search restaurant" /></label>
            <label className="td-select td-cp-station">
              <select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)} aria-label="Station">
                <option value="all">All stations</option>
                {stationNames.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <p className="td-cp-count">{form.restaurantIds.length} selected</p>
            <ul className="td-cp-restaurants">
              {visible.map((restaurant) => (
                <li key={restaurant.id}>
                  <label>
                    <input type="checkbox" checked={form.restaurantIds.includes(restaurant.id)} onChange={() => toggle(restaurant.id)} />
                    <span>{restaurant.name}</span>
                    <small>{stationOf(restaurant.id)}</small>
                  </label>
                </li>
              ))}
            </ul>
            {!visible.length && <p className="td-user-empty">{restaurantsQuery.isLoading ? "Loading restaurants…" : "No restaurants found."}</p>}
            {show("restaurantIds") && <small className="td-field-error">{errors.restaurantIds}</small>}
          </Card>

          <Card title="Schedule" subtitle="The banner shows only between these dates.">
            <div className="td-cp-pair">
              <label className="td-cp-field"><Label text="Start" /><input type="datetime-local" value={form.start} onChange={set("start")} />{show("start") && <small className="td-field-error">{errors.start}</small>}</label>
              <label className="td-cp-field"><Label text="End" /><input type="datetime-local" value={form.end} onChange={set("end")} />{show("end") && <small className="td-field-error">{errors.end}</small>}</label>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
