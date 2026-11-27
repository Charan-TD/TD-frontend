"use client";

import { useState } from "react";

import { useGetRestaurantReviewQuery, type RestaurantReview } from "../../restaurants/api/registrationRequestsApi";
import { publicRestaurantId } from "../../restaurants/api/restaurantId";
import { InitialsAvatar } from "../components/InitialsAvatar";
import { LocationMap } from "../components/LocationMap";
import { formatStatusLabel } from "../models/formatStatusLabel";
import { errorMessage, str } from "./approvalShared";
import { RestaurantDetailsTab } from "./RestaurantDetailsTab";
import { RestaurantMenuPanel } from "./RestaurantMenuPanel";
import { RestaurantProfileEditsBanner } from "./RestaurantProfileEditsBanner";
import { RestaurantTransactionsPanel } from "./RestaurantTransactionsPanel";

type Tab = "details" | "menu" | "transactions";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "menu", label: "Menu" },
  { id: "transactions", label: "Transactions" },
];

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);

const shortDate = (value: unknown) => {
  const date = typeof value === "string" ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
};

function Fact({ label, children }: { label: string; children: string }) {
  return <div className="td-rd-fact"><small>{label}</small><span>{children}</span></div>;
}

export function RestaurantDetailsView({
  restaurantId,
  restaurantName,
  fallback = null,
  onBack,
}: {
  restaurantId: string;
  restaurantName: string;
  /** The restaurant's list row, shown when it has no public ID to fetch full details with. */
  fallback?: RestaurantReview | null;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("details");
  const hasPublicId = publicRestaurantId(restaurantId) !== null;
  const query = useGetRestaurantReviewQuery(restaurantId, { skip: !hasPublicId && !!fallback });
  const r = hasPublicId || !fallback ? query.data : fallback;

  const name = (r && text(r.name)) ?? restaurantName;
  const online = r && typeof r.online_status === "string" ? r.online_status : null;
  const type = r && text(r.restaurant_type) ? formatStatusLabel(String(r.restaurant_type)) : "Restaurant";
  const address = r ? [r.house_no, r.landmark, r.city, r.state, r.pincode].filter(Boolean).join(", ") : "";
  const logo = r ? text(r.logo_url) ?? text(r.logo) : null;

  const publicId = text(r?.restaurant_id) ?? (hasPublicId ? restaurantId : null);
  const joined = shortDate(r?.created_at);
  const verified = shortDate(r?.verified_at) ?? shortDate(r?.approved_at);
  const meta = tab === "details"
    ? [publicId && `ID ${publicId}`, joined && `Joined ${joined}`, verified && `Verified ${verified}`].filter(Boolean).join(" · ")
    : [type, text(r?.owner_name) && `Owner ${text(r?.owner_name)}`, text(r?.owner_mobile), online ? null : "Hours not set"].filter(Boolean).join(" · ");

  const lat = r?.latitude;
  const lon = r?.longitude;
  const mapHref = lat != null && lon != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;

  return (
    <section className="td-page td-rd">
      <nav className="td-rd-crumbs" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}>‹ All Restaurants</button>
        <span aria-hidden="true">/</span>
        <span>{name}</span>
      </nav>

      <div className="td-rd-head">
        <div className="td-rd-top">
          <InitialsAvatar name={name} imageUrl={logo} size={56} />
          <div className="td-rd-title">
            <h2>{name}{tab === "details" && <span className="td-rd-type">{type}</span>}</h2>
            {meta && <p>{meta}</p>}
          </div>
          <span className="td-rd-status">Status: <b className={online === "CLOSED" ? "is-closed" : undefined}>{online === "CLOSED" ? "Closed" : online === "OPEN" ? "Open" : "—"}</b></span>
        </div>

        {tab === "details" && (
          query.isLoading && !r ? <div className="api-state">Loading restaurant details…</div>
          : !r ? <div className="api-state api-state--error">Could not load details. {errorMessage(query.error)}</div>
          : (
            <div className="td-rd-profile">
              <div className="td-rd-facts td-rd-facts--two">
                <Fact label="Owner">{str(r.owner_name)}</Fact>
                <Fact label="Owner mobile">{str(r.owner_mobile)}</Fact>
                <Fact label="Restaurant contact">{str(r.restaurant_contact)}</Fact>
                <Fact label="Email">{str(r.restaurant_email)}</Fact>
                <div className="td-rd-fact td-rd-fact--wide"><small>Location</small><span>{address || "-"}</span></div>
              </div>
              <div className="td-rd-map">
                <LocationMap latitude={r.latitude} longitude={r.longitude} address={address} label={name} />
                {mapHref && <a className="td-view-link" href={mapHref} target="_blank" rel="noopener noreferrer">View on map</a>}
              </div>
            </div>
          )
        )}

        <div className="td-rd-tabs" role="tablist" aria-label="Restaurant sections">
          {TABS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>
          ))}
        </div>
      </div>

      {tab === "details" && r && <RestaurantProfileEditsBanner restaurantIds={[restaurantId, text(r.restaurant_id) ?? ""].filter(Boolean)} ownerName={text(r.owner_name)} />}
      {tab === "details" && r && <RestaurantDetailsTab r={r} />}
      {tab === "menu" && <RestaurantMenuPanel restaurantId={restaurantId} restaurantName={name} />}
      {tab === "transactions" && <RestaurantTransactionsPanel />}
    </section>
  );
}
