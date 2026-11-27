"use client";

import { InitialsAvatar } from "../components/InitialsAvatar";
import { SidePanel } from "../components/SidePanel";
import { StatusSwitch } from "../components/StatusSwitch";
import { TransientSuccessMessage } from "../components/TransientSuccessMessage";
import { complaintStatusLabel } from "../models/complaints";
import type { CustomerUser } from "../models/customerUser";
import { noAccess } from "../models/disabledReason";
import { formatStatusLabel } from "../models/formatStatusLabel";
import { orderStatusTone } from "../models/orderStatusTone";
import { useComplaints } from "../viewmodels/complaintsStore";
import { rupees, orderTotal, shortDate, useUserOrders } from "../viewmodels/userOrders";
import { isUserBlocked } from "../viewmodels/usersViewModel";

type Props = {
  user: CustomerUser;
  onClose: () => void;
  onToggleBlock: () => void;
  onViewActivity: () => void;
  onViewAllOrders: () => void;
  isUpdating: boolean;
  canUpdate: boolean;
  successMessage: string;
};

export function UserDetailsPanel({ user, onClose, onToggleBlock, onViewActivity, onViewAllOrders, isUpdating, canUpdate, successMessage }: Props) {
  const stats = useUserOrders(user.id);
  const complaints = useComplaints().filter((c) => c.customerId === user.id || (user.full_name && c.customerName.toLowerCase() === user.full_name.toLowerCase()));
  const blocked = isUserBlocked(user);
  const name = user.full_name ?? "Unnamed user";
  const contact = [user.phone, user.email].filter(Boolean).join(" · ");
  const hint = !canUpdate ? noAccess(blocked ? "unblock users" : "block users") : isUpdating ? "Please wait, the user's status is being updated" : undefined;

  return (
    <SidePanel
      open
      onClose={onClose}
      title={name}
      header={(
        <div className="td-user-head">
          <InitialsAvatar name={user.full_name} imageUrl={user.profile_image_url} size={48} />
          <div>
            <h3>{name}<span className={`td-user-pill${blocked ? " is-blocked" : ""}`}>{blocked ? "Blocked" : "Active"}</span></h3>
            <p>{contact || `ID ${user.customer_id || user.id}`}</p>
          </div>
        </div>
      )}
      footer={(
        <>
          <button type="button" className="td-btn" onClick={onViewActivity}>View activity</button>
          <button type="button" className="td-btn td-btn--primary" onClick={onClose}>Done</button>
        </>
      )}
    >
      <TransientSuccessMessage message={successMessage} />

      <div className="td-user-stats">
        <div><small>Orders</small><strong>{stats.isLoading ? "-" : stats.count}</strong></div>
        <div><small>Total spent</small><strong>{stats.isLoading ? "-" : rupees(stats.spent)}</strong></div>
        <div><small>Joined</small><strong>{user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "-"}</strong></div>
        <div><small>Last order</small><strong>{stats.lastOrderAt ? shortDate(stats.lastOrderAt, true) : "-"}</strong></div>
      </div>

      <div className="td-user-section-head">
        <h4>Recent orders</h4>
        {stats.count > 0 && <button type="button" className="td-link-button" onClick={onViewAllOrders}>View all</button>}
      </div>
      {stats.orders.length === 0 ? <p className="td-user-empty">No orders yet.</p> : (
        <ul className="td-user-orders">
          {stats.orders.slice(0, 3).map((order) => (
            <li key={order.id}>
              <span><b>#{order.order_number ?? order.id.slice(0, 8)}</b><small>{[order.restaurant_name, shortDate(order.created_at)].filter(Boolean).join(" · ")}</small></span>
              <strong>{rupees(orderTotal(order))}</strong>
              <em className={`td-user-status td-user-status--${orderStatusTone(order.status_label ?? order.status)}`}>{formatStatusLabel(order.status_label ?? order.status)}</em>
            </li>
          ))}
        </ul>
      )}

      <div className="td-user-section-head"><h4>Complaints</h4></div>
      {complaints.length === 0 ? <p className="td-user-empty">No complaints.</p> : (
        <ul className="td-user-box-list">
          {complaints.slice(0, 3).map((c) => (
            <li key={c.id}>
              <span><b>{c.subject}</b><small>{c.id} · {shortDate(c.raisedAt, true)}</small></span>
              <em className={`td-user-status td-user-status--${c.status === "open" ? "danger" : c.status === "resolved" ? "success" : "info"}`}>{complaintStatusLabel[c.status]}</em>
            </li>
          ))}
        </ul>
      )}

      <div className="td-user-account">
        <span><b>Account status</b><small>Turn off to block this user from ordering</small></span>
        <StatusSwitch checked={!blocked} onLabel="Active" offLabel="Blocked" label={`${blocked ? "Unblock" : "Block"} ${name}`} disabled={!canUpdate || isUpdating} tooltip={hint} tooltipKind={canUpdate ? undefined : "access"} onChange={onToggleBlock} />
      </div>
    </SidePanel>
  );
}
