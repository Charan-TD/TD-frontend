"use client";

import type { AdminProfile } from "../models/portal";
import { Icon } from "../components/Icon";
import { useProfileViewModel } from "../viewmodels/profileViewModel";

export function ProfileView({ admin, onEdit }: { admin: AdminProfile; onEdit: () => void }) {
  const vm = useProfileViewModel(admin, onEdit);
  return (
    <>
      <section className="profile-hero">
        <div className="profile-identity"><span className="profile-avatar">{vm.admin.name.split(" ").map((word) => word[0]).join("")}</span><div><div className="profile-title"><h2>{vm.admin.name}</h2><span className="role-pill">{vm.admin.role}</span></div><p>Platform administrator · Train Dabba</p><span className="last-login"><i /> Last active {vm.admin.lastLogin}</span></div></div>
        <button className="primary-button" type="button" onClick={vm.onEdit}><Icon name="edit" size={16} /> Edit profile</button>
      </section>
      <section className="profile-columns">
        <article className="panel profile-details-panel"><header className="panel-header"><div><h3>Personal information</h3><p>Your registered administrator details</p></div></header><div className="details-grid"><div><span>Full name</span><strong>{vm.admin.name}</strong></div><div><span>Email address</span><strong>{vm.admin.email}</strong></div><div><span>Phone number</span><strong>{vm.admin.phone}</strong></div><div><span>Location</span><strong>{vm.admin.location}</strong></div></div></article>
        <article className="panel permissions-panel"><header className="panel-header"><div><h3>Platform access</h3><p>Your administrator permissions</p></div><span className="access-pill">Full access</span></header><div className="permission-list"><div><span><Icon name="users" size={15} /> Customers & riders</span><b>Manage</b></div><div><span><Icon name="store" size={15} /> Restaurants </span><b>Manage</b></div><div><span><Icon name="bag" size={15} /> Menus & orders</span><b>Manage</b></div><div><span><Icon name="wallet" size={15} /> Sales & payments</span><b>Manage</b></div></div></article>
      </section>
      <section className="profile-stats"><article><span className="stat-icon tone-orange"><Icon name="check" size={16} /></span><div><small>Days with Train Dabba</small><strong>284</strong></div></article><article><span className="stat-icon tone-indigo"><Icon name="chart" size={16} /></span><div><small>Actions this month</small><strong>184</strong></div></article><article><span className="stat-icon tone-mint"><Icon name="shield" size={16} /></span><div><small>Account health</small><strong>Secure</strong></div></article></section>
      <section className="security-banner"><span className="security-banner__icon"><Icon name="shield" size={21} /></span><div><h3>Your account is protected</h3><p>Admin-level controls and secure sign-in are active for this account.</p></div><button type="button" className="secondary-button">Change password <Icon name="arrow-right" size={15} /></button></section>
    </>
  );
}
