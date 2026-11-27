"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";

import { ConfirmDialog } from "../components/ConfirmDialog";
import { Icon } from "../components/Icon";
import { PageFooter } from "../components/PageFooter";
import { SectionActions, SectionSearch } from "../components/SectionActions";
import { SidePanel } from "../components/SidePanel";
import { StatusTabs } from "../components/StatusTabs";
import { TransientSuccessMessage } from "../components/TransientSuccessMessage";
import { useCreateAdminCategoryMutation, useGetAdminCategoriesQuery } from "../../restaurants/api/categoriesApi";
import {
  useCreateRecommendedItemMutation, useDeleteRecommendedItemsMutation, useGetRecommendedMenuQuery, useUpdateRecommendedItemMutation,
} from "../../restaurants/api/recommendedMenuApi";
import { noAccess } from "../models/disabledReason";
import { foodTypeLabel, type FoodType, type MenuCategory, type MenuItem } from "../models/recommendedMenu";
import { errorMessage } from "./approvalShared";

const PAGE_SIZE = 8;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
type TypeFilter = "all" | FoodType;

function CategoryGlyph({ category }: { category: MenuCategory }) {
  if (category.iconUrl) return <img src={category.iconUrl} alt="" />;
  return <Icon name="bag" size={16} />;
}

function FoodTypeBadge({ type }: { type: FoodType }) {
  return <span className={`td-food td-food--${type}`}><i />{foodTypeLabel[type]}</span>;
}

/** Picks an image, checks its type and size, and hands back the file plus a data URL for preview. */
function useImagePicker(onError: (message: string) => void) {
  const [url, setUrl] = useState<string | undefined>();
  const [picked, setPicked] = useState<File | null>(null);
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpe?g|webp)$/.test(file.type)) return onError("Choose a JPG or WEBP image.");
    if (file.size > MAX_IMAGE_BYTES) return onError("The image must be 2 MB or smaller.");
    onError("");
    setPicked(file);
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.readAsDataURL(file);
  };
  return { url, file: picked, choose };
}

export function RecommendedMenuView({ canAddCategory = true }: { canAddCategory?: boolean }) {
  const itemsQuery = useGetRecommendedMenuQuery();
  const [deleteRecommended, { isLoading: removing }] = useDeleteRecommendedItemsMutation();
  const { data: apiCategories = [], isLoading: categoriesLoading, isError: categoriesError } = useGetAdminCategoriesQuery();
  const categories: MenuCategory[] = apiCategories.map((c) => ({ id: c.category_id, name: c.category_name, iconUrl: c.cat_img_url ?? undefined }));
  // An item belongs to the admin category with the same name (or the same ID).
  const items: MenuItem[] = (itemsQuery.data ?? []).map((item) => ({
    id: item.id, name: item.name, foodType: item.foodType, imageUrl: item.imageUrl, prepTime: item.prepTime,
    categoryId: categories.find((c) => c.name.trim().toLowerCase() === item.categoryName.trim().toLowerCase() || c.id === item.categoryId)?.id ?? item.categoryId,
  }));
  const [deleteError, setDeleteError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryPanel, setCategoryPanel] = useState(false);
  const [itemPanel, setItemPanel] = useState<{ item?: MenuItem } | null>(null);
  const [deleting, setDeleting] = useState<MenuItem[] | null>(null);
  const [message, setMessage] = useState("");

  const needle = search.trim().toLowerCase();
  const inCategory = items.filter((item) => categoryId === "all" || item.categoryId === categoryId);
  const matching = inCategory.filter((item) => !needle || item.name.toLowerCase().includes(needle) || item.id.toLowerCase().includes(needle));
  const filtered = matching.filter((item) => typeFilter === "all" || item.foodType === typeFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const typeCount = (type: FoodType) => matching.filter((item) => item.foodType === type).length;
  const categoryOf = (id: string) => categories.find((c) => c.id === id);
  const activeCategory = categoryOf(categoryId);
  const allOnPageSelected = rows.length > 0 && rows.every((item) => selected.has(item.id));

  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAll = () => setSelected((prev) => { const next = new Set(prev); rows.forEach((item) => (allOnPageSelected ? next.delete(item.id) : next.add(item.id))); return next; });

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError("");
    try {
      await deleteRecommended(deleting.map((item) => item.id)).unwrap();
      setMessage(deleting.length === 1 ? `${deleting[0].name} was removed from the recommended menu.` : `${deleting.length} items were removed from the recommended menu.`);
    } catch (err) {
      setDeleteError(errorMessage(err));
    }
    // Whatever was deleted is gone from the refreshed list; drop it from the selection either way.
    setSelected((prev) => { const next = new Set(prev); deleting.forEach((item) => next.delete(item.id)); return next; });
    setDeleting(null);
  };

  return (
    <section className="td-page">
      <SectionSearch value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by item name or ID" />
      <SectionActions>
        <button type="button" className="td-btn td-btn--small" onClick={() => setCategoryPanel(true)} disabled={!canAddCategory}
          data-tooltip={canAddCategory ? undefined : noAccess("add categories")} data-tooltip-kind="access"><Icon name="plus" size={14} />Add category</button>
        <button type="button" className="td-btn td-btn--small td-btn--primary" onClick={() => setItemPanel({})}><Icon name="plus" size={14} />Add item</button>
      </SectionActions>
      <TransientSuccessMessage message={message} />
      {deleteError && <div className="api-state api-state--error" role="alert">Some items could not be deleted. {deleteError}</div>}
      {itemsQuery.isError && <div className="api-state api-state--error" role="alert">Unable to load the recommended menu. {errorMessage(itemsQuery.error)}</div>}

      <h2 className="td-menu-title">Recommended menu</h2>

      {categoriesError && <div className="api-state api-state--error" role="alert">Unable to load categories. Check the API connection.</div>}
      {categoriesLoading && !categoriesError && <div className="api-state">Loading categories…</div>}
      <div className="td-category-row" role="tablist" aria-label="Categories">
        <button type="button" role="tab" aria-selected={categoryId === "all"} className={`td-category${categoryId === "all" ? " is-active" : ""}`} onClick={() => { setCategoryId("all"); setPage(1); }}>
          <span className="td-category-icon td-category-icon--all"><Icon name="dashboard" size={15} /></span>
          <b>All</b><small>{items.length} items</small>
        </button>
        {categories.map((category) => (
          <button key={category.id} type="button" role="tab" aria-selected={categoryId === category.id} className={`td-category${categoryId === category.id ? " is-active" : ""}`} onClick={() => { setCategoryId(category.id); setPage(1); }}>
            <span className="td-category-icon"><CategoryGlyph category={category} /></span>
            <b>{category.name}</b><small>{items.filter((i) => i.categoryId === category.id).length} items</small>
          </button>
        ))}
      </div>

      <div className="td-table-card">
        <div className="td-table-card-head">
          <h3>{activeCategory ? `${activeCategory.name} items` : "All items"}</h3>
          <StatusTabs placement="inline" label="Filter items by food type" value={typeFilter} onChange={(v) => { setTypeFilter(v as TypeFilter); setPage(1); }}
            tabs={[{ id: "all", label: "All", count: matching.length }, { id: "veg", label: "Veg", count: typeCount("veg") }, { id: "non_veg", label: "Non-veg", count: typeCount("non_veg") }, { id: "egg", label: "Egg", count: typeCount("egg") }]} />
        </div>

        {selected.size > 0 && (
          <div className="td-bulk-bar" role="status">
            <span>{selected.size} selected</span>
            <button type="button" className="td-link-button" onClick={() => setSelected(new Set())}>Clear</button>
            <button type="button" className="td-outline-btn td-outline-btn--danger" onClick={() => setDeleting(items.filter((i) => selected.has(i.id)))}><Icon name="trash" size={14} />Delete selected</button>
          </div>
        )}

        <div className="td-table-scroll">
          <table className="td-table td-menu-table">
            <thead>
              <tr>
                <th className="td-check-col"><input type="checkbox" aria-label="Select all items on this page" checked={allOnPageSelected} onChange={toggleAll} /></th>
                <th>Item</th><th>Category</th><th>Food type</th><th className="td-th-right"><span className="td-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td className="td-check-col"><input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} /></td>
                  <td>
                    <div className="td-member">
                      <span className={`td-item-thumb td-item-thumb--${item.foodType}`}>
                        { }
                        {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <i />}
                      </span>
                      <span><strong>{item.name}</strong></span>
                    </div>
                  </td>
                  <td className="td-muted">{categoryOf(item.categoryId)?.name ?? "-"}</td>
                  <td><FoodTypeBadge type={item.foodType} /></td>
                  <td className="td-th-right">
                    <div className="td-row-actions">
                      <button type="button" aria-label={`Edit ${item.name}`} onClick={() => setItemPanel({ item })}><Icon name="edit" size={14} /></button>
                      <button type="button" className="is-danger" aria-label={`Delete ${item.name}`} onClick={() => setDeleting([item])}><Icon name="trash" size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="api-state">{itemsQuery.isLoading ? "Loading items…" : "No items found."}</div>}
        </div>
        {filtered.length > 0 && <PageFooter page={current} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} shown={rows.length} noun="items" onChange={setPage} />}
      </div>

      {categoryPanel && (
        <CategoryPanel
          onClose={() => setCategoryPanel(false)}
          onSaved={(name) => { setCategoryPanel(false); setMessage(`${name} category added.`); }}
        />
      )}
      {itemPanel && (
        <ItemPanel
          key={itemPanel.item?.id ?? "new"}
          item={itemPanel.item}
          categories={categories}
          defaultCategoryId={categoryId === "all" ? "" : categoryId}
          onClose={() => setItemPanel(null)}
          onSaved={(name, edited) => { setItemPanel(null); setMessage(edited ? `${name} updated.` : `${name} added to the recommended menu.`); }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={deleting && deleting.length > 1 ? `Delete ${deleting.length} items?` : "Delete this item?"}
        message={deleting && (deleting.length === 1 ? <><strong>{deleting[0].name}</strong> will no longer be recommended to restaurants.</> : "These items will no longer be recommended to restaurants.")}
        confirmLabel={removing ? "Deleting…" : "Delete"}
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <label className="td-menu-field">
      <span>{label}{required && <em> *</em>}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** Creates a category through POST /admin/categories (multipart: category_name + cat_img_id). */
function CategoryPanel({ onClose, onSaved }: { onClose: () => void; onSaved: (name: string) => void }) {
  const [createCategory, { isLoading: saving }] = useCreateAdminCategoryMutation();
  const [name, setName] = useState("");
  // The design has a description; POST /admin/categories only accepts a name and an image, so it is not sent.
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(picked.type)) return setImageError("Choose a JPG, PNG or WEBP image.");
    if (picked.size > MAX_IMAGE_BYTES) return setImageError("The image must be 2 MB or smaller.");
    setImageError("");
    setFile(picked);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(picked);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a category name.");
    if (!file) return setImageError("Category image is required.");
    const body = new FormData();
    body.append("category_name", trimmed);
    body.append("cat_img_id", file);
    try {
      await createCategory(body).unwrap();
      onSaved(trimmed);
    } catch (err) {
      const message = (err as { data?: { message?: string } } | undefined)?.data?.message;
      setError(message || "The category could not be saved. Try again.");
    }
  };

  return (
    <SidePanel open onClose={saving ? () => undefined : onClose} title="Add category" description="Category that restaurants can use on their menu."
      footer={<><button type="button" className="td-cancel-link" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="td-btn td-btn--primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save"}</button></>}>
      <div className="td-upload">
        <label className="td-upload-box td-upload-box--icon" aria-label="Upload category image">
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={choose} />
          {preview ? <img src={preview} alt="Category" /> : <Icon name="bag" size={34} />}
        </label>
        <div><label className="td-upload-link">Change icon<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={choose} /></label><p>Shown on the category card. JPG, PNG or WEBP, up to 2 MB.</p>{imageError && <p className="td-field-error">{imageError}</p>}</div>
      </div>
      <Field label="Category name" required hint="Each category name must be unique.">
        <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") void save(); }} placeholder="e.g. Biryani" maxLength={150} autoFocus disabled={saving} />
      </Field>
      {error && <p className="td-field-error" role="alert">{error}</p>}
      <Field label="Description">
        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What kind of dishes belong here?" maxLength={200} disabled={saving} />
      </Field>
    </SidePanel>
  );
}

function ItemPanel({ item, categories, defaultCategoryId, onClose, onSaved }: {
  item?: MenuItem; categories: MenuCategory[]; defaultCategoryId: string; onClose: () => void; onSaved: (name: string, edited: boolean) => void;
}) {
  const [createItem, { isLoading: creating }] = useCreateRecommendedItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateRecommendedItemMutation();
  const saving = creating || updating;
  const [name, setName] = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategoryId);
  const [foodType, setFoodType] = useState<FoodType>(item?.foodType ?? "veg");
  // The API needs a preparation time (at least 1 minute) even though restaurants set their own prices.
  const [prepTime, setPrepTime] = useState(item?.prepTime ? String(item.prepTime) : "");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const picker = useImagePicker(setImageError);
  const image = picker.url ?? item?.imageUrl;

  const save = async () => {
    const category = categories.find((c) => c.id === categoryId);
    const minutes = Number(prepTime);
    if (!name.trim()) return setError("Enter an item name.");
    if (!category) return setError("Select a category.");
    if (!Number.isInteger(minutes) || minutes < 1) return setError("Enter the preparation time in whole minutes (at least 1).");
    if (!item && !picker.file) return setImageError("Add an image (JPG or WEBP, up to 2 MB).");
    const body = new FormData();
    body.append("name", name.trim());
    body.append("category", category.name);
    body.append("food_served", foodType);
    body.append("preparation_time_minutes", String(minutes));
    // Prices are not stored on recommendations; restaurants set their own.
    if (!item) body.append("total_price", "0");
    if (picker.file) body.append("img_id", picker.file);
    try {
      if (item) await updateItem({ id: item.id, body }).unwrap();
      else await createItem(body).unwrap();
      onSaved(name.trim(), !!item);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <SidePanel open onClose={saving ? () => undefined : onClose} closeDisabled={saving} title={item ? "Edit item" : "Add item"} description="Suggest an item for restaurants to add to their menu."
      footer={<><button type="button" className="td-cancel-link" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="td-btn td-btn--primary" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : item ? "Save changes" : "Send recommendation"}</button></>}>
      <div className="td-upload">
        <label className="td-upload-box" aria-label="Upload image">
          <input type="file" accept="image/jpeg,image/webp" hidden onChange={picker.choose} />
          {image ? <img src={image} alt="Item" /> : <Icon name="file" size={30} />}
        </label>
        <div><label className="td-upload-link">Upload image<input type="file" accept="image/jpeg,image/webp" hidden onChange={picker.choose} /></label><p>Restaurants can use this photo or upload their own. JPG or WEBP, up to 2 MB.</p>{imageError && <p className="td-field-error">{imageError}</p>}</div>
      </div>
      <Field label="Item name" required>
        <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="e.g. Paneer Butter Masala" maxLength={255} autoFocus disabled={saving} />
      </Field>
      <Field label="Category" required>
        <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setError(""); }} disabled={saving}>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <div className="td-menu-field">
        <span>Food type<em> *</em></span>
        <div className="td-food-toggle" role="radiogroup" aria-label="Food type">
          {(["veg", "non_veg", "egg"] as FoodType[]).map((type) => (
            <button key={type} type="button" role="radio" aria-checked={foodType === type} className={foodType === type ? "is-active" : ""} onClick={() => setFoodType(type)} disabled={saving}>
              <span className={`td-food td-food--${type}`}><i /></span>{foodTypeLabel[type]}
            </button>
          ))}
        </div>
      </div>
      <Field label="Preparation time (minutes)" required>
        <input type="number" min={1} step={1} inputMode="numeric" value={prepTime} onChange={(e) => { setPrepTime(e.target.value); setError(""); }} placeholder="e.g. 20" disabled={saving} />
      </Field>
      {error && <p className="td-field-error" role="alert">{error}</p>}
      <p className="td-menu-note">Restaurants set their own price and turn the item on when they add it to their menu.</p>
    </SidePanel>
  );
}
