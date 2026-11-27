"use client";

import { useState } from "react";

import { ConfirmDialog } from "../../admin/components/ConfirmDialog";
import { Icon } from "../../admin/components/Icon";
import { SectionActions, SectionSearch } from "../../admin/components/SectionActions";
import { SidePanel } from "../../admin/components/SidePanel";
import { SkeletonTable } from "../../admin/components/Skeleton";
import { StatusSwitch } from "../../admin/components/StatusSwitch";
import { TransientSuccessMessage } from "../../admin/components/TransientSuccessMessage";
import { errorMessage } from "../../admin/views/approvalShared";
import {
  useCreateQtyTypeMutation,
  useDeleteQtyTypeMutation,
  useGetQtyTypesQuery,
  useUpdateQtyTypeMutation,
  type QtyType,
} from "../api/qtyTypesApi";

const MAX_NAME = 255;

/** Shared portion sizes that appear in every restaurant's menu-item form. */
export function QtyTypesView({ canEdit }: { canEdit: boolean }) {
  const qtyTypes = useGetQtyTypesQuery();
  const [create, { isLoading: creating }] = useCreateQtyTypeMutation();
  const [update, { isLoading: updating }] = useUpdateQtyTypeMutation();
  const [remove, { isLoading: removing }] = useDeleteQtyTypeMutation();

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  /** null = closed, "new" = adding, otherwise the one being renamed. */
  const [editing, setEditing] = useState<QtyType | "new" | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState<QtyType | null>(null);

  const term = search.trim().toLowerCase();
  const rows = (qtyTypes.data ?? []).filter((item) => !term || [item.name, item.code].some((value) => String(value ?? "").toLowerCase().includes(term)));
  const saving = creating || updating;
  const trimmed = name.trim();

  const openForm = (target: QtyType | "new") => { setEditing(target); setName(target === "new" ? "" : target.name); setFormError(""); };
  const closeForm = () => { if (!saving) setEditing(null); };

  const save = async () => {
    if (!editing || !trimmed || trimmed.length > MAX_NAME) return;
    setFormError("");
    try {
      if (editing === "new") {
        await create({ name: trimmed, status: "active" }).unwrap();
        setMessage(`Quantity type "${trimmed}" added.`);
      } else {
        await update({ id: editing.id, name: trimmed }).unwrap();
        setMessage(`Quantity type renamed to "${trimmed}".`);
      }
      setEditing(null);
    } catch (failure) {
      setFormError(errorMessage(failure));
    }
  };

  const toggle = async (item: QtyType) => {
    setTogglingId(item.id);
    setError("");
    try {
      await update({ id: item.id, status: item.status === "active" ? "inactive" : "active" }).unwrap();
      setMessage(`"${item.name}" is now ${item.status === "active" ? "inactive" : "active"}.`);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setError("");
    try {
      await remove(deleting.id).unwrap();
      setMessage(`Quantity type "${deleting.name}" deleted.`);
    } catch (failure) {
      // The API answers 409 while a menu item still uses it; its message says so.
      setError(errorMessage(failure));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={setSearch} placeholder="Search quantity types" />
      <SectionActions>
        <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={!canEdit} onClick={() => openForm("new")}
          data-tooltip={!canEdit ? "You do not have permission to add quantity types" : undefined}><Icon name="plus" size={13} />Add quantity type</button>
      </SectionActions>

      <TransientSuccessMessage message={message} />
      {error && <div className="api-state api-state--error" role="alert">{error}</div>}
      {qtyTypes.isError && <div className="api-state api-state--error" role="alert">Unable to load quantity types. {errorMessage(qtyTypes.error)}</div>}

      <div className="td-table-card">
        <div className="td-table-card-head"><h3>Quantity types</h3></div>
        {qtyTypes.isLoading && <SkeletonTable columns={["Name", "ID", "Status"]} />}
        {!qtyTypes.isLoading && !qtyTypes.isError && (
          <div className="td-table-scroll">
            <table className="td-table">
              <thead><tr><th>Name</th><th>ID</th><th>Status</th><th className="td-th-right">Actions</th></tr></thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td className="td-muted">{item.code ?? "—"}</td>
                    <td>
                      <StatusSwitch checked={item.status === "active"} onLabel="Active" offLabel="Inactive" label={`Status of ${item.name}`}
                        disabled={!canEdit || togglingId === item.id} tooltip={!canEdit ? "You do not have permission to edit quantity types" : undefined}
                        onChange={() => void toggle(item)} />
                    </td>
                    <td className="td-th-right">
                      <button type="button" className="td-view-link" disabled={!canEdit} onClick={() => openForm(item)} aria-label={`Rename ${item.name}`}>Rename</button>
                      {" "}
                      <button type="button" className="td-view-link" disabled={!canEdit} onClick={() => setDeleting(item)} aria-label={`Delete ${item.name}`}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <div className="api-state">{term ? "No quantity types match your search." : "No quantity types yet. Add one to offer restaurants a portion size."}</div>}
          </div>
        )}
      </div>

      <SidePanel open={editing !== null} onClose={closeForm} closeDisabled={saving} eyebrow="QUANTITY TYPE" title={editing === "new" ? "Add quantity type" : "Rename quantity type"}
        description="Shared by every restaurant, for example Half, Full or 500 ml."
        footer={<>
          <button type="button" className="td-btn td-btn--small" onClick={closeForm} disabled={saving}>Cancel</button>
          <button type="button" className="td-btn td-btn--primary td-btn--small" disabled={saving || !trimmed || trimmed.length > MAX_NAME || (editing !== "new" && editing?.name === trimmed)} onClick={() => void save()}>
            {saving ? "Saving..." : editing === "new" ? "Add" : "Save"}
          </button>
        </>}>
        <form className="td-ord-panel" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <label>
            <span>Name</span>
            <input className="td-input" value={name} maxLength={MAX_NAME} autoFocus disabled={saving} placeholder="e.g. Half" onChange={(event) => setName(event.target.value)} />
          </label>
          {formError && <div className="api-state api-state--error" role="alert">{formError}</div>}
        </form>
      </SidePanel>

      <ConfirmDialog open={deleting !== null} tone="danger" title="Delete quantity type?" confirmLabel="Delete" busyLabel="Deleting..." busy={removing}
        message={<>Delete <b>{deleting?.name}</b>? This can&apos;t be undone, and it fails while any menu item still uses it.</>}
        onConfirm={() => void confirmDelete()} onCancel={() => { if (!removing) setDeleting(null); }} />
    </section>
  );
}
