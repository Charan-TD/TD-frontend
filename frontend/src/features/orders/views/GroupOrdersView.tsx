"use client";

import { UserAvatar } from "../../admin/components/UserAvatar";
import { useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { MenuItem } from "../../restaurants/api/menuItemsApi";
import { useGetAdminGroupOrdersQuery, useGetGroupOrderRestaurantsQuery, useAssignGroupOrderRestaurantMutation, type GroupOrder, type GroupOrderRestaurant } from "../api/groupOrdersApi";
import { useGetRestaurantMenuItemsQuery } from "../../restaurants/api/menuItemsApi";
import { StatusTabs } from "../../admin/components/StatusTabs";
import { ListToolbar } from "../../admin/components/ListToolbar";
import { ListPagination } from "../../admin/components/ListPagination";
import { SkeletonTable } from "../../admin/components/Skeleton";
import { ManagementStatus } from "../../admin/components/ManagementStatus";
import { ManagementActionButton } from "../../admin/components/ManagementActionButton";
import { PrimaryActionButton } from "../../admin/components/PrimaryActionButton";
import { SidePanel } from "../../admin/components/SidePanel";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { RequiredFieldMark } from "../../admin/components/RequiredFieldMark";
import { Icon } from "../../admin/components/Icon";
import { errorMessage } from "../../admin/views/approvalShared";


const columns = ["Customer", "Mobile number", "Group size", "Order details", "Status", "Actions"];
const timestamp = (value: string | null) => value && !Number.isNaN(Date.parse(value))
  ? `${new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} IST`
  : "Not provided";

export function GroupOrdersView({ canAssign }: { canAssign: boolean }) {
  const orders = useGetAdminGroupOrdersQuery(undefined, { refetchOnMountOrArgChange: true });
  const restaurants = useGetGroupOrderRestaurantsQuery(undefined, { refetchOnMountOrArgChange: true });
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
  const data = orders.currentData ?? [];
  const isAssigned = (order: GroupOrder) => Boolean(order.restaurantId);
  const requests = data.filter((order) => !isAssigned(order));
  const time = (order: GroupOrder) => { const value = order.createdAt ? Date.parse(order.createdAt) : NaN; return Number.isNaN(value) ? 0 : value; };
  const assigned = data.filter(isAssigned).sort((a, b) => time(b) - time(a));
  const records = (tab === "assigned" ? assigned : requests).filter((order) => {

    return [order.requestNumber, order.contactName, order.mobile, order.email, order.details, order.status, order.restaurantName, order.restaurantId, order.groupSize].some((value) => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase()));
  });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(records.length / 10)));
  const close = () => { if (submitting.current) return; setSelected(null); setAssigning(false); setRestaurant(null); setQuantities({}); setMenuSearch(""); setAssignmentError(""); };
  const open = (order: GroupOrder, assign: boolean) => { setSelected(order); setAssigning(assign); setRestaurant(null); setQuantities({}); setMenuSearch(""); setAssignmentError(""); };
  const refresh = () => { if (submitting.current) return; close(); setMessage(""); void orders.refetch(); void restaurants.refetch(); };
  const submitAssignment = async () => {
    if (submitting.current || !selected || !restaurant || !canAssign || orders.isFetching || restaurants.isFetching || restaurants.isError || isAssigned(selected) || ["CANCELLED", "COMPLETED"].includes(selected.status.toUpperCase()) || !restaurants.currentData?.some((r) => r.id === restaurant.id)) return;
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
  return <section className="user-management-workspace">
    <StatusTabs label="Group order sections" value={tab} onChange={(value) => { setTab(value); setSearch(""); setPage(1); }} tabs={[{ id: "requests", label: "Group Orders", count: requests.length }, { id: "assigned", label: "Assigned Restaurants", count: assigned.length }]} />
    <TransientSuccessMessage message={message} />
    <ListToolbar value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search by customer, mobile, order details or restaurant" label="group orders" refreshing={orders.isFetching} onRefresh={refresh} />
    {orders.isError && <div className="api-state api-state--error" role="alert">Unable to load group orders. {errorMessage(orders.error)}</div>}
    {orders.isLoading && <SkeletonTable columns={tab === "assigned" ? [...columns.slice(0, -1), "Restaurant", "Actions"] : columns} />}
    {!orders.isLoading && !orders.isError && <div className="user-table-wrap"><table className="user-table"><thead><tr>{columns.slice(0, -1).map((label) => <th scope="col" key={label}>{label}</th>)}{tab === "assigned" && <th scope="col">Restaurant</th>}<th scope="col">Actions</th></tr></thead><tbody>
      {records.slice((currentPage - 1) * 10, currentPage * 10).map((order) => <tr key={order.key}>
        <td><div className="user-cell"><UserAvatar name={order.contactName} size="medium" /><span><strong>{order.contactName}</strong>{order.requestNumber && <small>{order.requestNumber}</small>}</span></div></td>
        <td>{order.mobile}</td><td>{order.groupSize ?? "—"}</td>
        <td><span className="group-order-summary" title={order.details}>{order.details}</span></td>
        <td><ManagementStatus status={order.status} /></td>
        {tab === "assigned" && <td><strong>{order.restaurantName ?? restaurants.data?.find((r) => r.id === order.restaurantId)?.name ?? order.restaurantId}</strong><div>{order.restaurantId}</div></td>}
        <td><div className="table-actions"><ManagementActionButton action="view" ariaLabel={`View group order from ${order.contactName}`} onClick={() => open(order, false)} />{!isAssigned(order) && <PrimaryActionButton type="button" disabled={saving || !canAssign || orders.isFetching || ["CANCELLED", "COMPLETED"].includes(order.status.toUpperCase())} data-tooltip={!canAssign ? "You do not have permission to assign orders" : ["CANCELLED", "COMPLETED"].includes(order.status.toUpperCase()) ? "This request is closed" : undefined} onClick={() => open(order, true)}>Assign restaurant</PrimaryActionButton>}</div></td>
      </tr>)}
    </tbody></table>{!records.length && <div className="api-state">{search ? "No group orders match your search." : tab === "assigned" ? "No restaurants have been assigned to group orders yet." : "No unassigned group order requests."}</div>}</div>}
    {!orders.isError && records.length > 0 && <ListPagination page={currentPage} count={Math.ceil(records.length / 10)} onChange={setPage} />}
    <SidePanel closeDisabled={saving} open={selected !== null} onClose={close} eyebrow="GROUP ORDER" title={assigning ? "Assign restaurant" : "Group order details"} description={assigning ? "Review the customer request and select a restaurant." : "Customer request and restaurant assignment."} footer={<><button type="button" className="secondary-button" onClick={close} disabled={saving}>Cancel</button>{assigning && <PrimaryActionButton type="button" disabled={saving || !selected?.requestNumber || !restaurant || !canAssign || restaurants.isError || restaurants.isFetching || orders.isFetching} onClick={() => void submitAssignment()}>{saving ? "Assigning..." : "Assign restaurant"}</PrimaryActionButton>}</>}>
      {selected && <>
        <dl className="group-order-facts">
          {([["user", "Customer", selected.contactName], ["phone", "Mobile number", selected.mobile], ["mail", "Email", selected.email ?? "Not provided"], ["group", "Group size", String(selected.groupSize ?? "Not provided")], ["calendar", "Received at", timestamp(selected.createdAt)]] as const).map(([icon, label, value]) => <div key={label}><span className="group-order-facts__icon"><Icon name={icon} size={16} /></span><div><dt>{label}</dt><dd>{value}</dd></div></div>)}
          <div><span className="group-order-facts__icon"><Icon name="info" size={16} /></span><div><dt>Status</dt><dd><ManagementStatus status={selected.status} /></dd></div></div>
        </dl>
        <div className="group-order-request"><span className="group-order-facts__icon"><Icon name="file" size={16} /></span><div><h4>Order details</h4><p>{selected.details}</p></div></div>
        {assigning ? <div className="form-grid group-order-assign">
          {!selected.requestNumber && <div className="api-state api-state--error" role="alert">This request is missing its group order ID (grp_ord_id). Refresh the list; if it is still missing, the API must include it before assignment is available.</div>}
          {assignmentError && <div className="api-state api-state--error" role="alert">{assignmentError}</div>}
          {restaurants.isError ? <div className="api-state api-state--error" role="alert">Unable to load available restaurants. <button type="button" className="text-button" onClick={() => void restaurants.refetch()}>Try again</button></div> : <>
            <Autocomplete options={restaurants.currentData ?? []} value={restaurant} onChange={(_, value) => { setRestaurant(value); setQuantities({}); setMenuSearch(""); }} getOptionLabel={(option) => `${option.name} (${option.id})`} isOptionEqualToValue={(option, value) => option.id === value.id} loading={restaurants.isFetching} disabled={saving || !canAssign || restaurants.isFetching} noOptionsText="No active restaurants available" renderInput={(params) => <TextField {...params} label={<span>Restaurant<RequiredFieldMark /></span>} placeholder="Search by restaurant name or ID" helperText="Choose from the active restaurants available for group orders." />} />
          </>}
          {restaurant && <div className="group-menu">
            <div className="group-menu__head"><h4>{restaurant.name} menu</h4>{!menu.isFetching && !menu.isError && <span className="group-menu__count">{menuItems.filter(inStock).length} in stock · {menuItems.length} items</span>}</div>
            {menu.isFetching && <div className="api-state">Loading menu...</div>}
            {menu.isError && <div className="api-state api-state--error" role="alert">Unable to load the menu. <button type="button" className="text-button" onClick={() => void menu.refetch()}>Try again</button></div>}
            {!menu.isFetching && !menu.isError && !menuItems.length && <div className="api-state">This restaurant has no available menu items.</div>}
            {!menu.isFetching && menuItems.length > 0 && <>
              <input type="search" className="group-menu__search" placeholder="Search items or categories" aria-label="Search menu items" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} />
              <div className="group-menu__list">
                {visibleItems.map((item) => {
                  const available = inStock(item);
                  const quantity = available ? quantities[item.id] ?? 0 : 0;
                  return <div className={`group-menu__item${quantity ? " group-menu__item--selected" : ""}${available ? "" : " group-menu__item--out"}`} key={item.id}>
                    <UserAvatar name={item.name} imageUrl={item.imageUrl} size="small" /><div className="group-menu__info"><strong title={item.name}>{item.name}</strong><span>{item.category ?? "Uncategorised"}</span></div>
                    <span className={`group-menu__stock group-menu__stock--${available ? "in" : "out"}`}>{available ? "In stock" : "Out of stock"}</span>
                    <span className="group-menu__price">{item.price != null ? `₹${item.price}` : "—"}</span>
                    <div className="group-menu__qty">
                      <button type="button" aria-label={`Decrease ${item.name}`} disabled={saving || !available || !quantity} onClick={() => setQuantity(item.id, quantity - 1)}>−</button>
                      <input type="number" min={0} max={999} inputMode="numeric" onWheel={(event) => event.currentTarget.blur()} aria-label={`Quantity of ${item.name}`} value={quantity || ""} placeholder="0" disabled={saving || !available} onChange={(event) => setQuantity(item.id, Math.floor(Number(event.target.value)) || 0)} />
                      <button type="button" aria-label={`Increase ${item.name}`} disabled={saving || !available || quantity >= 999} onClick={() => setQuantity(item.id, quantity + 1)}>+</button>
                    </div>
                  </div>;
                })}
                {!visibleItems.length && <div className="api-state">No items match your search.</div>}
              </div>
              <div className="group-menu__summary"><span>{selectedItems.length ? `${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} · ${piecesTotal} pieces` : "No items selected"}</span><strong>₹{itemsTotal.toFixed(2)}</strong></div>
            </>}
          </div>}
        </div> : selected.restaurantId && (() => { const name = selected.restaurantName ?? restaurants.data?.find((r) => r.id === selected.restaurantId)?.name ?? null; return <div className="group-order-request group-order-assigned"><span className="group-order-facts__icon"><Icon name="store" size={16} /></span><div><h4>Assigned restaurant</h4><p>{name ?? selected.restaurantId}</p>{name && <p className="group-order-assigned__id">{selected.restaurantId}</p>}</div></div>; })()}
      </>}
    </SidePanel>
  </section>;
}
