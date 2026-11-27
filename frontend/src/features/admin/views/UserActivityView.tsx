"use client";

import { useMemo, useState } from "react";

import { InitialsAvatar } from "../components/InitialsAvatar";
import { SectionSearch } from "../components/SectionActions";
import { useGetUsersQuery } from "../api/usersApi";
import { useComplaints } from "../viewmodels/complaintsStore";
import { takeActivityFocus } from "../viewmodels/activityFocus";
import { orderTotal, rupees, useUserOrders } from "../viewmodels/userOrders";
import { isUserBlocked } from "../viewmodels/usersViewModel";

type Event = { id: string; text: string; tag: "Orders" | "Complaints" | "Account"; at: Date; alert?: boolean };

const dayKey = (d: Date) => d.toDateString();
const dayLabel = (d: Date) => {
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return diff === 0 ? `Today · ${date}` : diff === 1 ? `Yesterday · ${date}` : date;
};
const timeLabel = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

export function UserActivityView() {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(() => takeActivityFocus());
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState(7);
  const [shown, setShown] = useState(10);
  const [now] = useState(() => Date.now());

  const usersQuery = useGetUsersQuery({ search, page: 1, limit: 30 });
  const users = usersQuery.currentData?.users ?? [];
  const user = users.find((u) => u.id === picked) ?? users[0] ?? null;

  const stats = useUserOrders(user?.id);
  const allComplaints = useComplaints();

  const events = useMemo<Event[]>(() => {
    if (!user) return [];
    const list: Event[] = stats.orders.map((o) => ({
      id: `o-${o.id}`, tag: "Orders", at: new Date(o.created_at ?? 0),
      text: `Placed order #${o.order_number ?? o.id.slice(0, 8)}${o.restaurant_name ? ` · ${o.restaurant_name}` : ""} · ${rupees(orderTotal(o))}`,
    }));
    allComplaints
      .filter((c) => c.customerName.toLowerCase() === (user.full_name ?? "").toLowerCase())
      .forEach((c) => list.push({ id: `c-${c.id}`, tag: "Complaints", at: new Date(c.raisedAt), alert: c.status === "open", text: `Raised complaint ${c.id} — ${c.subject}` }));
    if (user.created_at) list.push({ id: "joined", tag: "Account", at: new Date(user.created_at), text: "Created account" });
    return list.sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [user, stats.orders, allComplaints]);

  const userComplaints = events.filter((e) => e.tag === "Complaints");
  const openComplaints = userComplaints.filter((e) => e.alert).length;

  const cutoff = now - range * 86400000;
  const visible = events.filter((e) => (category === "all" || e.tag === category) && (range === 0 || e.at.getTime() >= cutoff));
  const groups = visible.slice(0, shown).reduce<{ key: string; label: string; items: Event[] }[]>((acc, e) => {
    const last = acc[acc.length - 1];
    if (last && last.key === dayKey(e.at)) last.items.push(e);
    else acc.push({ key: dayKey(e.at), label: dayLabel(e.at), items: [e] });
    return acc;
  }, []);

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const ordersThisMonth = stats.orders.filter((o) => new Date(o.created_at ?? 0) >= monthStart).length;

  return (
    <section className="td-activity-view">
      <SectionSearch value={search} onChange={setSearch} placeholder="Search a user to track" />
      <aside className="td-activity-users">
        <header><h3>Users</h3><p>Pick a user to see their activity</p></header>
        <ul>
          {users.map((u) => (
            <li key={u.id}>
              <button type="button" className={u.id === user?.id ? "is-active" : ""} onClick={() => { setPicked(u.id); setShown(10); }}>
                <InitialsAvatar name={u.full_name} imageUrl={u.profile_image_url} size={32} />
                <span><b>{u.full_name ?? "Unnamed user"}</b><small>{isUserBlocked(u) ? "Blocked" : u.phone ?? "Active"}</small></span>
              </button>
            </li>
          ))}
          {!users.length && <li className="td-user-empty">{usersQuery.isLoading ? "Loading..." : "No users found."}</li>}
        </ul>
      </aside>

      {user ? (
        <div className="td-activity-main-col">
          <div className="td-activity-profile">
            <InitialsAvatar name={user.full_name} imageUrl={user.profile_image_url} size={52} />
            <div>
              <h3>{user.full_name ?? "Unnamed user"}<span className={`td-user-pill${isUserBlocked(user) ? " is-blocked" : ""}`}>{isUserBlocked(user) ? "Blocked" : "Active"}</span></h3>
              <p>{[user.phone, user.email, user.created_at ? `Joined ${new Date(user.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : null].filter(Boolean).join(" · ")}</p>
            </div>
          </div>

          <div className="td-activity-tiles">
            <div><small>Orders this month</small><strong>{ordersThisMonth}</strong></div>
            <div><small>Total spent</small><strong>{rupees(stats.spent)}</strong></div>
            <div><small>Complaints</small><strong className={openComplaints ? "is-danger" : ""}>{openComplaints ? `${openComplaints} open` : "None"}</strong></div>
            <div><small>Last active</small><strong>{events[0] ? timeLabel(events[0].at) : "-"}</strong></div>
          </div>

          <div className="td-activity-feed-card">
            <header>
              <h3>Activity</h3>
              <select value={category} onChange={(e) => { setCategory(e.target.value); setShown(10); }} aria-label="Activity type">
                <option value="all">All activity</option><option value="Orders">Orders</option><option value="Complaints">Complaints</option><option value="Account">Account</option>
              </select>
              <select value={range} onChange={(e) => { setRange(Number(e.target.value)); setShown(10); }} aria-label="Time range">
                <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={0}>All time</option>
              </select>
            </header>
            {groups.map((group) => (
              <div key={group.key}>
                <div className="td-activity-day">{group.label}</div>
                <ul>
                  {group.items.map((e) => (
                    <li key={e.id}>
                      <i className={e.alert ? "is-alert" : ""} />
                      <span>{e.text}</span>
                      <em>{e.tag}</em>
                      <time>{timeLabel(e.at)}</time>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!groups.length && <p className="td-user-empty td-activity-none">No activity in this period.</p>}
            {visible.length > shown && <div className="td-activity-more"><button type="button" className="td-outline-btn" onClick={() => setShown((n) => n + 10)}>Load older activity</button></div>}
          </div>
        </div>
      ) : <div className="api-state">Select a user to see their activity.</div>}
    </section>
  );
}
