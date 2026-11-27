"use client";

import { useMemo, useState } from "react";

import { Icon } from "../components/Icon";
import { SidePanel } from "../components/SidePanel";
import { StatusSwitch } from "../components/StatusSwitch";
import {
  useGetRestaurantMenuItemsQuery,
  useSetMenuItemStatusMutation,
  type MenuItem,
} from "../../restaurants/api/menuItemsApi";
import { errorMessage } from "./approvalShared";

const NOTE_LIMIT = 400;
const REASONS = ["Out of stock", "Customer complaints about this item", "Wrong price or details", "Food safety or quality issue", "Other"];
const SEPARATOR = " — ";

/** The API stores one reason string, so the chosen reason and the note are joined with a dash. */
const splitReason = (value: string | null) => {
  const [reason = "", ...note] = (value ?? "").split(SEPARATOR);
  return { reason, note: note.join(SEPARATOR) };
};

function FoodMark({ type }: { type: string | null }) {
  return type ? <span className={`td-food td-food--${type}`}><i /></span> : null;
}

type FoodFilter = "all" | "veg" | "egg" | "non_veg";

const FOOD_FILTERS: { id: FoodFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "veg", label: "Veg" },
  { id: "egg", label: "Egg" },
  { id: "non_veg", label: "Non-veg" },
];

// An admin status that was never set counts as active; only an explicit false is inactive.
const isInactive = (item: MenuItem) => item.adminAvailable === false;

const rupees = (value: number | null) =>
  value == null ? "-" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const UNCATEGORISED = "Uncategorised";

export function RestaurantMenuPanel({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const { data, isLoading, isError, error } = useGetRestaurantMenuItemsQuery({ id: restaurantId, name: restaurantName });
  const items = useMemo(() => data?.items ?? [], [data]);

  const [setStatus, { isLoading: saving }] = useSetMenuItemStatusMutation();
  const [deactivating, setDeactivating] = useState<MenuItem | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState("");
  const [viewing, setViewing] = useState<MenuItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [food, setFood] = useState<FoodFilter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const apply = async (item: MenuItem, active: boolean, why?: string) => {
    setActionError(null);
    setBusyId(item.id);
    try {
      await setStatus({ restaurantId, itemId: item.id, active, reason: why }).unwrap();
      setDeactivating(null);
      setViewing(null);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const term = search.trim().toLowerCase();
  const visible = items.filter((item) => {
    if (food !== "all" && item.foodServed !== food) return false;
    return !term || item.name.toLowerCase().includes(term) || (item.category ?? "").toLowerCase().includes(term) || (item.subCategory ?? "").toLowerCase().includes(term);
  });

  // Group by category, keeping the order in which categories first appear.
  const groups = new Map<string, MenuItem[]>();
  visible.forEach((item) => {
    const key = item.category ?? UNCATEGORISED;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });

  const toggleGroup = (name: string) => setCollapsed((prev) => { const next = new Set(prev); if (next.has(name)) next.delete(name); else next.add(name); return next; });
  // While searching, show every matching group open.
  const isOpen = (name: string) => !!term || !collapsed.has(name);

  return (
    <div className="td-rd-card td-rd-menu">
      <div className="td-rd-menu-bar">
        <label className="td-rd-search">
          <Icon name="search" size={15} />
          <input type="search" placeholder="Search items or categories" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search menu items" />
        </label>
        <div className="td-rd-segment" role="group" aria-label="Food type">
          {FOOD_FILTERS.map((filter) => (
            <button key={filter.id} type="button" className={food === filter.id ? "is-active" : ""} aria-pressed={food === filter.id} onClick={() => setFood(filter.id)}>
              {filter.id !== "all" && <span className={`td-food td-food--${filter.id}`}><i /></span>}
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {actionError && !deactivating && <div className="api-state api-state--error">{actionError}</div>}
      {isError && <div className="api-state api-state--error">Unable to load this restaurant&apos;s menu. {errorMessage(error)}</div>}
      {isLoading && <div className="api-state">Loading menu…</div>}

      {!isLoading && !isError && [...groups.entries()].map(([name, group]) => (
        <section key={name} className="td-rd-group">
          <button type="button" className="td-rd-group-head" aria-expanded={isOpen(name)} onClick={() => toggleGroup(name)}>
            <span className={isOpen(name) ? "is-open" : undefined}><Icon name="chevron-down" size={14} /></span>
            {name}
          </button>
          {isOpen(name) && group.map((item) => {
            const off = isInactive(item);
            const busy = busyId === item.id;
            const sub = [item.description, item.prepMinutes != null ? `${item.prepMinutes} min prep` : null, item.ownerAvailable ? null : "Out of stock"].filter(Boolean).join(" · ");
            return (
              <div key={item.id} className="td-rd-item">
                <div className="td-rd-item-main">
                  <b className="td-rd-item-name">
                    {item.foodServed && <span className={`td-food td-food--${item.foodServed}`}><i /></span>}
                    {item.name}
                  </b>
                  {sub && <small>{sub}</small>}
                  {off && (
                    <small className="td-rd-off">
                      Turned off{item.inactiveReason && <> · {splitReason(item.inactiveReason).reason} · </>}<button type="button" onClick={() => setViewing(item)}>View reason</button>
                    </small>
                  )}
                </div>
                <span className="td-rd-price">
                  {rupees(item.price)}
                  {item.originalPrice != null && <s>{rupees(item.originalPrice)}</s>}
                </span>
                <StatusSwitch
                  checked={!off}
                  onLabel="On"
                  offLabel="Off"
                  label={`${off ? "Turn on" : "Turn off"} ${item.name}`}
                  disabled={busy}
                  tooltip={busy ? "Please wait, the item is being updated" : undefined}
                  onChange={() => {
                    setActionError(null);
                    if (off) void apply(item, true);
                    else { setReason(REASONS[0]); setNote(""); setDeactivating(item); }
                  }}
                />
              </div>
            );
          })}
        </section>
      ))}

      {!isLoading && !isError && visible.length === 0 && (
        <div className="api-state">
          {items.length > 0 ? "No items match these filters." : `No menu items found for ${restaurantName}.`}
        </div>
      )}

      {deactivating && (
        <div className="td-rd-modal-backdrop" role="presentation" onClick={() => !saving && setDeactivating(null)}>
          <div className="td-rd-modal" role="dialog" aria-modal="true" aria-label="Turn off menu item" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><h3>Turn off this item?</h3><p>Customers won&apos;t be able to order it until it&apos;s turned back on.</p></div>
              <button type="button" className="td-rd-x" aria-label="Close" disabled={saving} onClick={() => setDeactivating(null)}>×</button>
            </header>
            <div className="td-rd-modal-body">
              <div className="td-rd-modal-item">
                <div><b className="td-rd-item-name"><FoodMark type={deactivating.foodServed} />{deactivating.name}</b><small>{[deactivating.category, restaurantName].filter(Boolean).join(" · ")}</small></div>
                <b>{rupees(deactivating.price)}</b>
              </div>
              <fieldset className="td-rd-reasons">
                <legend>Reason <em>*</em></legend>
                {REASONS.map((option) => (
                  <label key={option}><input type="radio" name="off-reason" checked={reason === option} onChange={() => setReason(option)} />{option}</label>
                ))}
              </fieldset>
              <label className="td-rd-note">
                <span>Note <small>(shared with the restaurant)</small></span>
                <textarea rows={3} maxLength={NOTE_LIMIT} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add details the restaurant should know" />
              </label>
              <div className="td-rd-info" role="note"><Icon name="info" size={16} /><span>The restaurant owner will be notified.</span></div>
              {actionError && <div className="api-state api-state--error">{actionError}</div>}
            </div>
            <footer>
              <button type="button" className="td-btn td-btn--small" disabled={saving} onClick={() => setDeactivating(null)}>Cancel</button>
              <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={saving} onClick={() => apply(deactivating, false, note.trim() ? `${reason}${SEPARATOR}${note.trim()}` : reason)}>{saving ? "Turning off…" : "Turn off item"}</button>
            </footer>
          </div>
        </div>
      )}

      <SidePanel
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? "Item"}
        header={viewing && (
          <div className="td-rd-why-head">
            <span className="td-rd-why-status">Status: <b>Off</b></span>
            <h3><FoodMark type={viewing.foodServed} />{viewing.name}</h3>
            <p>{[viewing.category, rupees(viewing.price), restaurantName].filter((part) => part && part !== "-").join(" · ")}</p>
          </div>
        )}
        footer={viewing && (
          <>
            <button type="button" className="td-btn td-btn--small" onClick={() => setViewing(null)}>Close</button>
            <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={saving} onClick={() => void apply(viewing, true)}>{saving ? "Turning on…" : "Turn item back on"}</button>
          </>
        )}
      >
        {viewing && (() => {
          const parts = splitReason(viewing.inactiveReason);
          return (
            <div className="td-rd-why">
              <h4>Why it&apos;s off</h4>
              <dl>
                <div><dt>Reason</dt><dd>{parts.reason || "No reason recorded"}</dd></div>
              </dl>
              {parts.note && <div className="td-rd-why-note"><small>Note</small><p>{parts.note}</p></div>}
              {actionError && <div className="api-state api-state--error">{actionError}</div>}
            </div>
          );
        })()}
      </SidePanel>
    </div>
  );
}
