"use client";

import type { AdminProfile } from "../models/portal";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { useEditProfileViewModel } from "../viewmodels/editProfileViewModel";

type Props = { admin: AdminProfile; savedMessage: string; onBack: () => void; onSave: (profile: Pick<AdminProfile, "name" | "email" | "phone" | "location">) => void };

export function EditProfileView({ admin, savedMessage, onBack, onSave }: Props) {
  const vm = useEditProfileViewModel(admin, savedMessage, onBack, onSave);
  const { form, update, submit } = vm;
  return (
    <main className="edit-screen">
      <header className="edit-topbar"><button type="button" className="back-button" onClick={vm.onBack}><Icon name="arrow-left" size={16} /> Back to profile</button><Brand compact /><span className="role-pill">Super Admin</span></header>
      <div className="edit-container"><section className="edit-heading"><span className="eyebrow">ACCOUNT SETTINGS</span><h1>Make it yours.</h1><p>Keep your personal details current for a smoother admin experience.</p></section>
        <form className="edit-layout" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <section className="edit-panel"><header><div><h2>Personal information</h2><p>Details visible to your Train Dabba team.</p></div><span className="edit-step">01</span></header><div className="form-grid"><label>Full name<input value={form.name} onChange={(event) => update("name", event.target.value)} required /></label><label>Email address<input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></label><label>Phone number<input value={form.phone} onChange={(event) => update("phone", event.target.value)} required /></label><label>Location<input value={form.location} onChange={(event) => update("location", event.target.value)} required /></label></div></section>
          <aside className="edit-profile-summary"><span className="edit-profile-avatar">{form.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span><h2>{form.name}</h2><p>{vm.admin.role}</p><hr /><dl><div><dt>ACCOUNT STATUS</dt><dd><i /> Active</dd></div><div><dt>LAST LOGIN</dt><dd>{vm.admin.lastLogin}</dd></div></dl></aside>
          <section className="edit-panel password-panel"><header><div><h2>Password</h2><p>Leave blank to keep your current password.</p></div><span className="edit-step">02</span></header><div className="form-grid"><label>Current password<input type="password" placeholder="Enter current password" /></label><label>New password<input type="password" placeholder="Create a new password" /></label></div></section>
          <footer className="edit-actions"><button className="secondary-button" type="button" onClick={vm.onBack}>Cancel</button><button className="primary-button" type="submit"><Icon name="check" size={16} /> Save changes</button></footer>
          {vm.savedMessage && <div className="save-toast" role="status"><Icon name="check" size={16} /> {vm.savedMessage}</div>}
        </form>
      </div>
    </main>
  );
}
