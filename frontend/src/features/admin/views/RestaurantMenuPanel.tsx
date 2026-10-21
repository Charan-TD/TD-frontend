"use client";

import { useMemo, useState } from "react";
import { RefreshButton } from "../components/RefreshButton";
import { SkeletonTable } from "../components/Skeleton";
import {
  useGetRestaurantMenuItemsQuery,
  useSetMenuItemStatusMutation,
  type MenuItem,
} from "../../restaurants/api/menuItemsApi";
import { errorMessage } from "./approvalShared";

const REASON_LIMIT = 500;

type FoodFilter = "all" | "veg" | "egg" | "non_veg";
type StatusFilter = "all" | "active" | "inactive";

const FOOD_FILTERS: { id: FoodFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "veg", label: "Veg" },
  { id: "egg", label: "Egg" },
  { id: "non_veg", label: "Non-veg" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Any status" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" },
];

const FOOD_LABEL: Record<string, string> = { veg: "Veg", egg: "Egg", non_veg: "Non-veg" };

// An admin status that was never set counts as active; only an explicit false is inactive.
const isActive = (item: MenuItem) => item.adminAvailable !== false;
const isInactive = (item: MenuItem) => item.adminAvailable === false;

const rupees = (value: number | null) =>
  value == null ? "—" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function FoodType({ value }: { value: string | null }) {
  if (!value) return <span className="menu-muted">—</span>;
  return (
    <span className={`food-type food-type--${value}`}>
      <i aria-hidden="true" />
      {FOOD_LABEL[value] ?? value}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="menu-field">
      <span className="menu-field__label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export function RestaurantMenuPanel({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetRestaurantMenuItemsQuery({
    id: restaurantId,
    name: restaurantName,
  });
  const items = useMemo(() => data?.items ?? [], [data]);

  const [setStatus, { isLoading: saving }] = useSetMenuItemStatusMutation();
  const [deactivating, setDeactivating] = useState<MenuItem | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [food, setFood] = useState<FoodFilter>("all");
  const [status, setStatusFilter] = useState<StatusFilter>("all");

  const apply = async (item: MenuItem, active: boolean, why?: string) => {
    setActionError(null);
    setBusyId(item.id);
    try {
      await setStatus({ restaurantId, itemId: item.id, active, reason: why }).unwrap();
      setDeactivating(null);
      setReason("");
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const inStock = items.filter((item) => item.ownerAvailable).length;

  const visible = items.filter((item) => {
    if (food !== "all" && item.foodServed !== food) return false;
    if (status === "active" && !isActive(item)) return false;
    if (status === "inactive" && !isInactive(item)) return false;
    const term = search.trim().toLowerCase();
    return !term || item.name.toLowerCase().includes(term) || (item.category ?? "").toLowerCase().includes(term) || (item.subCategory ?? "").toLowerCase().includes(term);
  });

  const stat = (value: number) => (isLoading ? "…" : value);

  return (
    <div className="restaurant-menu">
      <div className="menu-stats">
        <div className="menu-stat menu-stat--total">
          <span>Total items</span>
          <strong>{stat(items.length)}</strong>
        </div>
        <div className="menu-stat menu-stat--in">
          <span>In stock</span>
          <strong>{stat(inStock)}</strong>
        </div>
        <div className="menu-stat menu-stat--out">
          <span>Out of stock</span>
          <strong>{stat(items.length - inStock)}</strong>
        </div>
      </div>

      <div className="menu-toolbar">
        <input
          type="search"
          className="menu-search"
          placeholder="Search items or categories"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search menu items"
        />
        <div className="menu-segment" role="group" aria-label="Food type">
          {FOOD_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={food === filter.id ? "is-selected" : ""}
              aria-pressed={food === filter.id}
              onClick={() => setFood(filter.id)}
            >
              {filter.id !== "all" && <i className={`food-dot food-dot--${filter.id}`} aria-hidden="true" />}
              {filter.label}
            </button>
          ))}
        </div>
        <div className="menu-segment" role="group" aria-label="Admin status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={status === filter.id ? "is-selected" : ""}
              aria-pressed={status === filter.id}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <RefreshButton refreshing={isFetching} label="the menu" onRefresh={() => refetch()} />
      </div>

      {actionError && !deactivating && <div className="api-state api-state--error">{actionError}</div>}

      {isError && (
        <div className="api-state api-state--error">
          Unable to load this restaurant&apos;s menu. {errorMessage(error)}
        </div>
      )}

      {isLoading && <SkeletonTable columns={["Item", "Category", "Food type", "Prep time", "Price", "Stock", "Action"]} />}

      {!isLoading && !isError && (
        <ul className="menu-list">
          {visible.length > 0 && (
            <li className="menu-head" aria-hidden="true">
              <span>Item</span>
              <span>Category / Sub-category</span>
              <span>Food type</span>
              <span>Prep time</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Admin status</span>
              <span className="menu-head__actions">Action</span>
            </li>
          )}
          {visible.map((item) => {
            const active = isActive(item);
            const busy = busyId === item.id;

            return (
              <li key={item.id} className={`menu-row${isInactive(item) ? " menu-row--inactive" : ""}`}>
                <div className="menu-row__item">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="menu-row__noimg" aria-hidden="true">
                      🍽
                    </span>
                  )}
                  <div>
                    <strong>{item.name}</strong>
                    {item.description && <p>{item.description}</p>}
                  </div>
                </div>

                <Field label="Category">
                  {item.category || item.subCategory ? (
                    <span className="menu-category">
                      {item.category && <strong>{item.category}</strong>}
                      {item.subCategory && <span>{item.subCategory}</span>}
                    </span>
                  ) : (
                    <span className="menu-muted">—</span>
                  )}
                </Field>

                <Field label="Food type">
                  <FoodType value={item.foodServed} />
                </Field>

                <Field label="Prep time">
                  {item.prepMinutes != null ? `${item.prepMinutes} min` : <span className="menu-muted">—</span>}
                </Field>

                <Field label="Price">
                  <span className="menu-price">
                    {rupees(item.price)}
                    {item.originalPrice != null && <s>{rupees(item.originalPrice)}</s>}
                  </span>
                </Field>

                <Field label="Stock">
                  <span className={`stock-pill${item.ownerAvailable ? " stock-pill--in" : " stock-pill--out"}`}>
                    {item.ownerAvailable ? "In stock" : "Out of stock"}
                  </span>
                </Field>

                <Field label="Admin status">
                  <span
                    className={`admin-pill admin-pill--${active ? "active" : "inactive"}`}
                  >
                    {active ? "Active" : "Inactive"}
                  </span>
                  {isInactive(item) && item.inactiveReason && (
                    <div className="menu-item-reason">{item.inactiveReason}</div>
                  )}
                </Field>

                <div className="menu-row__actions">
                  {!active && (
                    <button
                      type="button"
                      className="secondary-button menu-action menu-action--activate"
                      disabled={busy}
                      onClick={() => apply(item, true)}
                    >
                      {busy ? "Activating…" : "Activate"}
                    </button>
                  )}
                  {active && (
                    <button
                      type="button"
                      className="secondary-button menu-action menu-action--deactivate"
                      disabled={busy}
                      onClick={() => {
                        setActionError(null);
                        setReason("");
                        setDeactivating(item);
                      }}
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && !isError && visible.length === 0 && (
        <div className="api-state">
          {items.length > 0 ? (
            "No items match these filters."
          ) : (
            <>
              No menu items found for {restaurantName}.
              {data && (
                <div className="menu-item-reason">
                  Searched for restaurant {restaurantId}. The API returned {data.scanned} item
                  {data.scanned === 1 ? "" : "s"}
                  {data.restaurantNames.length > 0 && <> from: {data.restaurantNames.join(", ")}</>}.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {deactivating && (
        <div className="modal-backdrop" onClick={() => !saving && setDeactivating(null)}>
          <div
            className="modal-card modal-card--pop approval-detail"
            role="dialog"
            aria-modal="true"
            aria-label="Deactivate menu item"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Deactivate {deactivating.name}?</h3>
            <p>Customers will no longer be able to order this item until it is activated again.</p>
            <label htmlFor="deactivate-reason">Reason (optional)</label>
            <textarea
              id="deactivate-reason"
              rows={3}
              maxLength={REASON_LIMIT}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Item does not meet quality standards"
              autoFocus
            />
            {actionError && <div className="api-state api-state--error">{actionError}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" disabled={saving} onClick={() => setDeactivating(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-button confirm-dialog-danger"
                disabled={saving}
                onClick={() => apply(deactivating, false, reason)}
              >
                {saving ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
