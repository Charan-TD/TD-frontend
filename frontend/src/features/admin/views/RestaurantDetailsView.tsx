"use client";

import { useState } from "react";
import { useGetRestaurantReviewQuery } from "../../restaurants/api/registrationRequestsApi";
import { ReviewDetails } from "./RegistrationApprovalsPanel";
import { RestaurantMenuPanel } from "./RestaurantMenuPanel";

type Tab = "details" | "menu";

const TABS: { id: Tab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "menu", label: "Menu" },
];

export function RestaurantDetailsView({
  restaurantId,
  restaurantName,
  onBack,
}: {
  restaurantId: string;
  restaurantName: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<Tab>("details");
  const { data: restaurant } = useGetRestaurantReviewQuery(restaurantId);
  const online = typeof restaurant?.online_status === "string" ? restaurant.online_status : null;

  return (
    <section className="user-management-workspace">
      <header className="user-activity-header">
        <div>
          <button type="button" className="back-link" onClick={onBack}>
            ← All restaurants
          </button>
          <span className="eyebrow">RESTAURANT</span>
          <h2>{restaurant?.name ?? restaurantName}</h2>
          <p>
            {typeof restaurant?.restaurant_type === "string" ? restaurant.restaurant_type : "Restaurant"} ·{" "}
            {online ? (online === "OPEN" ? "Open now" : "Closed now") : "Hours not set"}
          </p>
        </div>
      </header>

      <div className="approval-kind" role="tablist" aria-label="Restaurant sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "is-selected" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <div className="restaurant-detail-grid">
          <ReviewDetails restaurantId={restaurantId} />
        </div>
      ) : (
        <RestaurantMenuPanel restaurantId={restaurantId} restaurantName={restaurant?.name ?? restaurantName} />
      )}
    </section>
  );
}
