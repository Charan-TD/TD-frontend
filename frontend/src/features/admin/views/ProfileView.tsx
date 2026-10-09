"use client";

import type { AdminProfile } from "../models/portal";
import { navigationSections } from "../models/navigation";
import { Icon } from "../components/Icon";
import { useProfileViewModel } from "../viewmodels/profileViewModel";

const actionLabels = { read: "View", insert: "Create", update: "Edit", delete: "Delete" } as const;

export function ProfileView({ admin, onEdit }: { admin: AdminProfile; onEdit: () => void }) {
  const vm = useProfileViewModel(admin, onEdit);
  // Only the sections this employee's role can actually open, with the actions it grants.
  const accessibleSections = navigationSections.filter((item) => item.section !== "dashboard" && vm.admin.access.includes(item.section));
  return (
    <>
      <section className="profile-hero">
        <div className="profile-identity"><span className="profile-avatar">{vm.admin.name.split(" ").map((word) => word[0]).join("")}</span><div><div className="profile-title"><h2>{vm.admin.name}</h2><span className="role-pill">{vm.admin.role}</span></div><p>Train Dabba</p></div></div>
        <button className="primary-button" type="button" onClick={vm.onEdit}><Icon name="edit" size={16} /> Edit profile</button>
      </section>
      <section className="profile-columns">
        <article className="panel profile-details-panel"><header className="panel-header"><div><h3>Personal information</h3><p>Your registered account details</p></div></header><div className="details-grid"><div><span>Full name</span><strong>{vm.admin.name || "—"}</strong></div><div><span>Email address</span><strong>{vm.admin.email || "—"}</strong></div><div><span>Phone number</span><strong>{vm.admin.phone || "—"}</strong></div><div><span>Location</span><strong>{vm.admin.location || "—"}</strong></div></div></article>
        <article className="panel permissions-panel"><header className="panel-header"><div><h3>Platform access</h3><p>Sections your role can open</p></div></header><div className="permission-list">
          {accessibleSections.map((item) => (
            <div key={item.id}><span><Icon name={item.icon} size={15} /> {item.label}</span><b>{(vm.admin.permissions[item.section] ?? []).map((action) => actionLabels[action]).join(", ")}</b></div>
          ))}
          {!accessibleSections.length && <div><span>No sections assigned to your role yet.</span></div>}
        </div></article>
      </section>
      <section className="profile-stats"><article><span className="stat-icon tone-orange"><Icon name="check" size={16} /></span><div><small>Days with Train Dabba</small><strong>—</strong></div></article><article><span className="stat-icon tone-indigo"><Icon name="chart" size={16} /></span><div><small>Actions this month</small><strong>—</strong></div></article><article><span className="stat-icon tone-mint"><Icon name="shield" size={16} /></span><div><small>Account health</small><strong>—</strong></div></article></section>
      <section className="security-banner"><span className="security-banner__icon"><Icon name="shield" size={21} /></span><div><h3>Your account is protected</h3><p>Admin-level controls and secure sign-in are active for this account.</p></div><button type="button" className="secondary-button">Change password <Icon name="arrow-right" size={15} /></button></section>
    </>
  );
}
