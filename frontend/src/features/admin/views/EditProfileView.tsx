"use client";

import type { AdminProfile } from "../models/portal";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { RequiredFieldMark } from "../components/RequiredFieldMark";
import { TransientSuccessMessage } from "../components/TransientSuccessMessage";
import { UserAvatar } from "../components/UserAvatar";
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
          <section className="edit-panel"><header><div><h2>Personal information</h2><p>Details visible to your Train Dabba team.</p></div><span className="edit-step">01</span></header><div className="form-grid"><label><span>Full name<RequiredFieldMark /></span><input value={form.name} onChange={(event) => update("name", event.target.value)} required /></label><label><span>Email address<RequiredFieldMark /></span><input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></label><label><span>Phone number<RequiredFieldMark /></span><input value={form.phone} onChange={(event) => update("phone", event.target.value)} required /></label><label><span>Location<RequiredFieldMark /></span><input value={form.location} onChange={(event) => update("location", event.target.value)} required /></label></div></section>
          <aside className="edit-profile-summary"><UserAvatar name={form.name} imageUrl={vm.admin.imageUrl} size="large" /><h2>{form.name}</h2><p>{vm.admin.role}</p><hr /><dl><div><dt>ACCOUNT STATUS</dt><dd><i /> Active</dd></div></dl></aside>
          <section className="edit-panel password-panel"><header><div><h2>Password</h2><p>Leave blank to keep your current password.</p></div><span className="edit-step">02</span></header><div className="form-grid"><label>Current password<input type="password" placeholder="Enter current password" /></label><label>New password<input type="password" placeholder="Create a new password" /></label></div></section>
          <footer className="edit-actions"><button className="secondary-button" type="button" onClick={vm.onBack}>Cancel</button><button className="primary-button" type="submit"><Icon name="check" size={16} /> Save changes</button></footer>
          <TransientSuccessMessage message={vm.savedMessage} className="save-toast" />
        </form>
      </div>
    </main>
  );
}
