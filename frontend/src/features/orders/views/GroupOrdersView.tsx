"use client";

import { useRef, useState, type ReactNode } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import { Icon } from "../../admin/components/Icon";
import { InitialsAvatar } from "../../admin/components/InitialsAvatar";
import { PageFooter } from "../../admin/components/PageFooter";
import { RequiredFieldMark } from "../../admin/components/RequiredFieldMark";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { SidePanel } from "../../admin/components/SidePanel";
import { SkeletonTable } from "../../admin/components/Skeleton";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { UserAvatar } from "../../admin/components/UserAvatar";
import { errorMessage } from "../../admin/views/approvalShared";
import { useGetRestaurantMenuItemsQuery, type MenuItem } from "../../restaurants/api/menuItemsApi";
import { useGetAllStationsQuery } from "../../stations/api/stationsApi";
import { GROUP_ORDER_STATUSES, useAssignGroupOrderRestaurantMutation, useGetAdminGroupOrdersQuery, useGetGroupOrderRestaurantsQuery, useUpdateGroupOrderStatusMutation, type GroupOrder, type GroupOrderRestaurant, type GroupOrderStatus } from "../api/groupOrdersApi";

const PAGE_SIZE = 10;
const dash = (value: string | null | undefined) => (value && value.trim() ? value : "—");

const mobileOf = (mobile: string) => (/^\d{10}$/.test(mobile) ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}` : mobile);
const shortDate = (value: string | null) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};
const longDate = (value: string | null) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
};

/** The label and dot colour for a group order. */
function statusOf(order: GroupOrder): { label: string; tone: string } {
  const status = order.status.toUpperCase();
  if (status === "CANCELLED") return { label: "Cancelled", tone: "bad" };
  if (status === "COMPLETED") return { label: "Completed", tone: "ok" };
  if (status === "CONFIRMED") return { label: "Confirmed", tone: "purple" };
  if (status === "CONTACTED") return { label: "Contacted", tone: "info" };
  return order.restaurantId ? { label: "Assigned", tone: "info" } : { label: "Pending", tone: "warn" };
}

function Status({ order }: { order: GroupOrder }) {
  const { label, tone } = statusOf(order);
  return <span className={`td-ord-status td-ord-status--${tone}`}>{label}</span>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

export function GroupOrdersView({ canAssign }: { canAssign: boolean }) {
  const orders = useGetAdminGroupOrdersQuery(undefined, { refetchOnMountOrArgChange: true });
  const restaurants = useGetGroupOrderRestaurantsQuery(undefined, { refetchOnMountOrArgChange: true });
  const stationsQuery = useGetAllStationsQuery();
  const [tab, setTab] = useState("requests");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<GroupOrder | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [restaurant, setRestaurant] = useState<GroupOrderRestaurant | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [menuSearch, setMenuSearch] = useState("");
  const menu = useGetRestaurantMenuItemsQuery({ id: restaurant?.id ?? "", name: restaurant?.name ?? "" }, { skip: !restaurant });
  // In stock = the restaurant has it switched on and admin has not deactivated it.
  const inStock = (item: MenuItem) => item.ownerAvailable && item.adminAvailable !== false;
  const menuItems = menu.currentData?.items ?? [];
  const visibleItems = menuItems.filter((item) => [item.name, item.category, item.subCategory].some((value) => String(value ?? "").toLowerCase().includes(menuSearch.trim().toLowerCase())));
  const setQuantity = (id: string, quantity: number) => setQuantities((current) => {
    const next = { ...current };
    if (quantity > 0) next[id] = Math.min(quantity, 999); else delete next[id];
    return next;
  });
  const selectedItems = menuItems.filter((item) => inStock(item) && quantities[item.id]);
  const itemsTotal = selectedItems.reduce((sum, item) => sum + (item.price ?? 0) * quantities[item.id], 0);
  const piecesTotal = selectedItems.reduce((sum, item) => sum + quantities[item.id], 0);
  const [assignRestaurant, { isLoading: saving }] = useAssignGroupOrderRestaurantMutation();
  const submitting = useRef(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [message, setMessage] = useState("");
  const [updateStatus] = useUpdateGroupOrderStatusMutation();

  /** Saves a new lifecycle status; resolves to an error message, or null on success. */
  const changeStatus = async (order: GroupOrder, status: GroupOrderStatus): Promise<string | null> => {
    if (!order.requestNumber) return "This request is missing its group order ID (grp_ord_id), so its status can't be changed.";
    try {
      await updateStatus({ grpOrdId: order.requestNumber, status }).unwrap();
    } catch (error) {
      const failure = error as { data?: { message?: string }; error?: string };
      return failure.data?.message ?? failure.error ?? "Could not update the status. Please try again.";
    }
    setSelected((current) => (current && current.key === order.key ? { ...current, status } : current));
    setMessage(`${order.contactName}'s group order is now ${status.charAt(0)}${status.slice(1).toLowerCase()}.`);
    return null;
  };

  const data = orders.currentData ?? [];
  const isAssigned = (order: GroupOrder) => Boolean(order.restaurantId);
  const requests = data.filter((order) => !isAssigned(order));
  const time = (order: GroupOrder) => { const value = order.createdAt ? Date.parse(order.createdAt) : NaN; return Number.isNaN(value) ? 0 : value; };
  const assigned = data.filter(isAssigned).sort((a, b) => time(b) - time(a));
  const term = search.trim().toLowerCase();
  const records = (tab === "assigned" ? assigned : requests).filter((order) =>
    [order.requestNumber, order.contactName, order.mobile, order.email, order.details, order.status, order.restaurantName, order.restaurantId, order.groupSize].some((value) => String(value ?? "").toLowerCase().includes(term)));
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const restaurantName = (order: GroupOrder) => order.restaurantName ?? restaurants.data?.find((r) => r.id === order.restaurantId)?.name ?? order.restaurantId;
  const closed = (order: GroupOrder) => ["CANCELLED", "COMPLETED"].includes(order.status.toUpperCase());

  const close = () => { if (submitting.current) return; setSelected(null); setAssigning(false); setRestaurant(null); setQuantities({}); setMenuSearch(""); setAssignmentError(""); };
  const open = (order: GroupOrder, assign: boolean) => { setSelected(order); setAssigning(assign); setRestaurant(null); setQuantities({}); setMenuSearch(""); setAssignmentError(""); };

  const submitAssignment = async () => {
    if (submitting.current || !selected || !restaurant || !canAssign || orders.isFetching || restaurants.isFetching || restaurants.isError || isAssigned(selected) || closed(selected) || !restaurants.currentData?.some((r) => r.id === restaurant.id)) return;
    if (!selected.requestNumber) { setAssignmentError("This request is missing its group order ID (grp_ord_id). The API must include it before this order can be assigned."); return; }
    submitting.current = true;
    setAssignmentError("");
    try {
      await assignRestaurant({ grpOrdId: selected.requestNumber, restaurantId: restaurant.id, items: selectedItems.map((item) => ({ menuItemId: item.id, quantity: quantities[item.id] })) }).unwrap();
    } catch (error) {
      const failure = error as { data?: { message?: string }; error?: string };
      setAssignmentError(failure.data?.message ?? failure.error ?? "Could not assign the restaurant. Please try again.");
      submitting.current = false;
      return;
    }
    submitting.current = false;
    setMessage(`${restaurant.name} was assigned to ${selected.contactName}'s group order.`);
    close(); setSearch(""); setPage(1); setTab("assigned");
    try { await orders.refetch().unwrap(); }
    catch { setMessage("Restaurant assignment was saved, but the order list could not refresh. Refresh the list to see the updated assignment."); }
  };

  const isAssignedTab = tab === "assigned";
  const stations = stationsQuery.data ?? [];

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search customer, mobile, PNR or restaurant" />
      <SectionActions>
        <label className="td-select">
          {/* Group orders do not carry a station yet, so this cannot filter them. */}
          <select aria-label="Station" disabled data-tooltip="Group orders can't be filtered by station yet." defaultValue="all">
            <option value="all">All stations</option>
            {stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
          </select>
        </label>
      </SectionActions>

      <TransientSuccessMessage message={message} />
      {orders.isError && <div className="api-state api-state--error" role="alert">Unable to load group orders. {errorMessage(orders.error)}</div>}

      <div className="td-table-card">
        <div className="td-table-card-head td-table-card-head--end">
          <StatusTabs placement="inline" label="Group order sections" value={tab} onChange={(value) => { setTab(value); setPage(1); }}
            tabs={[{ id: "requests", label: "New requests", count: requests.length }, { id: "assigned", label: "Assigned", count: assigned.length }]} />
        </div>

        {orders.isLoading && <SkeletonTable columns={isAssignedTab ? ["Customer", "Group size", "Delivery", "Restaurant", "Status"] : ["Customer", "Mobile", "Group size", "Order details", "Delivery", "Status", "Actions"]} />}

        {!orders.isLoading && !orders.isError && (
          <>
            <div className="td-table-scroll">
              <table className="td-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    {!isAssignedTab && <><th>Mobile</th></>}
                    <th>Group size</th>
                    {!isAssignedTab && <th>Order details</th>}
                    <th>Delivery</th>
                    {isAssignedTab && <th>Restaurant</th>}
                    <th>Status</th>
                    <th><span className="td-sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr key={order.key}>
                      <td>
                        <div className="td-member">
                          <InitialsAvatar name={order.contactName} size={isAssignedTab ? 36 : 32} />
                          <span><strong>{order.contactName}</strong>
                            {isAssignedTab
                              ? <small>{dash(order.requestNumber)}</small>
                              : <button type="button" className="td-ord-link" onClick={() => open(order, false)}>View details</button>}
                          </span>
                        </div>
                      </td>
                      {!isAssignedTab && <td className="td-muted">{mobileOf(order.mobile)}</td>}
                      <td><strong>{order.groupSize == null ? "—" : order.groupSize.toLocaleString("en-IN")}</strong></td>
                      {!isAssignedTab && <td className="td-muted td-gord-details" title={order.details}>{order.details}</td>}
                      <td><div className="td-contact"><span>—</span><small>{shortDate(order.createdAt)}</small></div></td>
                      {isAssignedTab && <td><div className="td-contact"><span>{dash(restaurantName(order))}</span><small>{order.restaurantName ? order.restaurantId : ""}</small></div></td>}
                      <td><Status order={order} /></td>
                      <td className="td-th-right">
                        {isAssignedTab
                          ? <button type="button" className="td-view-link" onClick={() => open(order, false)} aria-label={`View group order from ${order.contactName}`}>View</button>
                          : (
                            <button type="button" className="td-outline-btn td-outline-btn--brand" disabled={saving || !canAssign || orders.isFetching || closed(order)}
                              data-tooltip={!canAssign ? "You do not have permission to assign orders" : closed(order) ? "This request is closed" : undefined} onClick={() => open(order, true)}>
                              <Icon name="plus" size={13} />Assign restaurant
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div className="api-state">{search ? "No group orders match your search." : isAssignedTab ? "No restaurants have been assigned to group orders yet." : "No unassigned group order requests."}</div>}
            </div>
            {records.length > 0 && <PageFooter page={currentPage} totalPages={totalPages} total={records.length} pageSize={PAGE_SIZE} shown={rows.length} noun={isAssignedTab ? "group orders" : "requests"} onChange={setPage} />}
          </>
        )}
      </div>

      {selected && !assigning && <DetailsPanel order={selected} restaurantName={restaurantName(selected)} onClose={close} canUpdateStatus={canAssign} onChangeStatus={(status) => changeStatus(selected, status)} />}

      <SidePanel closeDisabled={saving} open={selected !== null && assigning} onClose={close} eyebrow="GROUP ORDER" title="Assign restaurant" description="Review the customer request and select a restaurant."
        footer={<><button type="button" className="td-btn td-btn--small" onClick={close} disabled={saving}>Cancel</button>
          <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={saving || !selected?.requestNumber || !restaurant || !canAssign || restaurants.isError || restaurants.isFetching || orders.isFetching} onClick={() => void submitAssignment()}>{saving ? "Assigning..." : "Assign restaurant"}</button></>}>
        {selected && assigning && (
          <>
            <div className="td-ord-panel">
              <section>
                <h4>Request</h4>
                <dl>
                  <Row label="Customer">{selected.contactName}</Row>
                  <Row label="Mobile">{mobileOf(selected.mobile)}</Row>
                  <Row label="Group size">{selected.groupSize ?? "—"}</Row>
                  <Row label="PNR">{dash(selected.pnr)}</Row>
                </dl>
                <div className="td-gord-note"><small>Order details</small><p>{selected.details}</p></div>
              </section>
            </div>
            <div className="form-grid group-order-assign">
              {!selected.requestNumber && <div className="api-state api-state--error" role="alert">This request is missing its group order ID (grp_ord_id). Refresh the list; if it is still missing, the API must include it before assignment is available.</div>}
              {assignmentError && <div className="api-state api-state--error" role="alert">{assignmentError}</div>}
              {restaurants.isError ? <div className="api-state api-state--error" role="alert">Unable to load available restaurants. <button type="button" className="text-button" onClick={() => void restaurants.refetch()}>Try again</button></div> : (
                <Autocomplete options={restaurants.currentData ?? []} value={restaurant} onChange={(_, value) => { setRestaurant(value); setQuantities({}); setMenuSearch(""); }} getOptionLabel={(option) => `${option.name} (${option.id})`} isOptionEqualToValue={(option, value) => option.id === value.id} loading={restaurants.isFetching} disabled={saving || !canAssign || restaurants.isFetching} noOptionsText="No active restaurants available" renderInput={(params) => <TextField {...params} label={<span>Restaurant<RequiredFieldMark /></span>} placeholder="Search by restaurant name or ID" helperText="Choose from the active restaurants available for group orders." />} />
              )}
              {restaurant && (
                <div className="group-menu">
                  <div className="group-menu__head"><h4>{restaurant.name} menu</h4>{!menu.isFetching && !menu.isError && <span className="group-menu__count">{menuItems.filter(inStock).length} in stock · {menuItems.length} items</span>}</div>
                  {menu.isFetching && <div className="api-state">Loading menu...</div>}
                  {menu.isError && <div className="api-state api-state--error" role="alert">Unable to load the menu. <button type="button" className="text-button" onClick={() => void menu.refetch()}>Try again</button></div>}
                  {!menu.isFetching && !menu.isError && !menuItems.length && <div className="api-state">This restaurant has no available menu items.</div>}
                  {!menu.isFetching && menuItems.length > 0 && (
                    <>
                      <input type="search" className="group-menu__search" placeholder="Search items or categories" aria-label="Search menu items" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} />
                      <div className="group-menu__list">
                        {visibleItems.map((item) => {
                          const available = inStock(item);
                          const quantity = available ? quantities[item.id] ?? 0 : 0;
                          return (
                            <div className={`group-menu__item${quantity ? " group-menu__item--selected" : ""}${available ? "" : " group-menu__item--out"}`} key={item.id}>
                              <div className="group-menu__details"><UserAvatar name={item.name} imageUrl={item.imageUrl} size="small" /><div className="group-menu__info"><strong>{item.name}</strong><span>{item.category ?? "Uncategorised"}</span></div></div>
                              <span className={`group-menu__stock group-menu__stock--${available ? "in" : "out"}`}>{available ? "In stock" : "Out of stock"}</span>
                              <span className="group-menu__price">{item.price != null ? `₹${item.price}` : "—"}</span>
                              <div className="group-menu__qty">
                                <button type="button" aria-label={`Decrease ${item.name}`} disabled={saving || !available || !quantity} onClick={() => setQuantity(item.id, quantity - 1)}>−</button>
                                <input type="number" min={0} max={999} inputMode="numeric" onWheel={(event) => event.currentTarget.blur()} aria-label={`Quantity of ${item.name}`} value={quantity || ""} placeholder="0" disabled={saving || !available} onChange={(event) => setQuantity(item.id, Math.floor(Number(event.target.value)) || 0)} />
                                <button type="button" aria-label={`Increase ${item.name}`} disabled={saving || !available || quantity >= 999} onClick={() => setQuantity(item.id, quantity + 1)}>+</button>
                              </div>
                            </div>
                          );
                        })}
                        {!visibleItems.length && <div className="api-state">No items match your search.</div>}
                      </div>
                      <div className="group-menu__summary"><span>{selectedItems.length ? `${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} · ${piecesTotal} pieces` : "No items selected"}</span><strong>₹{itemsTotal.toFixed(2)}</strong></div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </SidePanel>
    </section>
  );
}

const STEPS = ["Request received", "Restaurant assigned", "Food ready", "Out for delivery", "Delivered"];

function DetailsPanel({ order, restaurantName, onClose, canUpdateStatus, onChangeStatus }: { order: GroupOrder; restaurantName: string | null; onClose: () => void; canUpdateStatus: boolean; onChangeStatus: (status: GroupOrderStatus) => Promise<string | null> }) {
  const { label, tone } = statusOf(order);
  const current = order.status.toUpperCase() as GroupOrderStatus;
  const [next, setNext] = useState<GroupOrderStatus>(GROUP_ORDER_STATUSES.includes(current) ? current : "PENDING");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setSaving(true);
    setError("");
    const failure = await onChangeStatus(next);
    setSaving(false);
    if (failure) setError(failure);
  };
  const status = order.status.toUpperCase();
  const done = status === "COMPLETED" ? 5 : order.restaurantId ? 2 : 1;
  const when = [longDate(order.createdAt), "", "", "", ""];
  return (
    <SidePanel open onClose={onClose} title={order.requestNumber ?? "Group order"}
      header={(
        <div className="td-ord-head">
          <p className="td-gord-meta">{dash(order.requestNumber)} <span className={`td-ord-status td-ord-status--${tone}`}>{label}</span></p>
          <h3>Group order for {order.groupSize ?? "—"} people</h3>
        </div>
      )}
      footer={<button type="button" className="td-btn td-btn--small" onClick={onClose}>Close</button>}>
      <div className="td-ord-panel">
        <section>
          <h4>Status</h4>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label className="td-select">
              <select aria-label="Group order status" value={next} disabled={saving || !canUpdateStatus} onChange={(event) => setNext(event.target.value as GroupOrderStatus)}>
                {GROUP_ORDER_STATUSES.map((value) => <option key={value} value={value}>{value.charAt(0)}{value.slice(1).toLowerCase()}</option>)}
              </select>
            </label>
            <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={saving || !canUpdateStatus || next === current}
              data-tooltip={!canUpdateStatus ? "You do not have permission to update orders" : undefined} onClick={() => void save()}>{saving ? "Saving..." : "Update status"}</button>
          </div>
          {error && <div className="api-state api-state--error" role="alert">{error}</div>}
        </section>
        <section>
          <h4>Customer</h4>
          <dl>
            <Row label="Name">{order.contactName}</Row>
            <Row label="Mobile">{mobileOf(order.mobile)}</Row>
            <Row label="Email">{dash(order.email)}</Row>
          </dl>
        </section>
        <section>
          <h4>Request</h4>
          <dl>
            <Row label="Group size">{order.groupSize == null ? "—" : `${order.groupSize} people`}</Row>
            <Row label="PNR">{dash(order.pnr)}</Row>
            <Row label="Received">{longDate(order.createdAt)}</Row>
          </dl>
          <div className="td-gord-note"><small>Order details</small><p>{order.details}</p></div>
        </section>
        <section>
          <h4>Delivery</h4>
          <dl>
            <Row label="Station">—</Row>
            <Row label="Train">—</Row>
            <Row label="Coach">—</Row>
            <Row label="Deliver by">—</Row>
          </dl>
        </section>
        <section>
          <h4>Assigned restaurant</h4>
          <dl>
            <Row label="Restaurant">{order.restaurantId ? dash(restaurantName) : "Not assigned yet"}</Row>
            <Row label="Restaurant ID">{dash(order.restaurantId)}</Row>
            <Row label="Contact">—</Row>
            <Row label="Assigned by">—</Row>
          </dl>
        </section>
        <section>
          <h4>Progress</h4>
          <ol className="td-ord-steps">
            {STEPS.map((step, index) => (
              <li key={step} className={index < done ? "is-done" : undefined}>{step}{when[index] && index < done ? <small>{when[index]}</small> : null}</li>
            ))}
          </ol>
        </section>
      </div>
    </SidePanel>
  );
}
