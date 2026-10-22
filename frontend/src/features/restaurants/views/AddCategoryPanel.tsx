"use client";

import { useState } from "react";

import { RefreshButton } from "../../admin/components/RefreshButton";
import { SidePanel } from "../../admin/components/SidePanel";
import { disabledReason } from "../../admin/models/disabledReason";
import { useCreateAdminCategoryMutation, useGetAdminCategoriesQuery } from "../api/categoriesApi";

const NAME_MAX = 150;

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Side panel to create an admin category and see the categories already listed. */
export function AddCategoryPanel({ open, onClose }: Props) {
  const { data: categories = [], isLoading, isFetching, isError, refetch } = useGetAdminCategoriesQuery(undefined, {
    skip: !open,
  });
  const [createCategory, { isLoading: saving }] = useCreateAdminCategoryMutation();

  const [name, setName] = useState("");
  const [showError, setShowError] = useState(false);
  const [formError, setFormError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const trimmed = name.trim();
  const nameError = !trimmed ? "Category name is required" : undefined;
  const saveBlocked = disabledReason([saving, "Saving the category…"]);

  const close = () => {
    if (saving) return;
    setName("");
    setShowError(false);
    setFormError("");
    setSavedMessage("");
    onClose();
  };

  const submit = async () => {
    setShowError(true);
    setFormError("");
    setSavedMessage("");
    if (nameError) return;

    try {
      await createCategory({ category_name: trimmed }).unwrap();
      setSavedMessage(`${trimmed} was added.`);
      setName("");
      setShowError(false);
    } catch (error) {
      const message = (error as { data?: { message?: string } } | undefined)?.data?.message;
      setFormError(message || "The category could not be saved. Try again.");
    }
  };

  return (
    <SidePanel
      open={open}
      onClose={close}
      eyebrow="CATEGORY"
      title="Add category"
      description="Create an admin category. All categories are listed below."
      closeDisabled={saving}
    >
      <div className="form-grid">
        <label className="station-picker-slot">
          <span>Category name *</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
            placeholder="e.g. Biryani"
            maxLength={NAME_MAX}
            disabled={saving}
          />
          {showError && nameError ? (
            <small className="field-error" role="alert">{nameError}</small>
          ) : (
            <small>Each category name must be unique.</small>
          )}
        </label>
      </div>

      {formError && <div className="api-state api-state--error">{formError}</div>}
      {savedMessage && <div className="api-state">{savedMessage}</div>}

      <div className="assign-role-actions">
        <button type="button" className="secondary-button" onClick={close} disabled={saving}>
          Close
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={submit}
          disabled={Boolean(saveBlocked)}
          data-tooltip={saveBlocked}
        >
          {saving ? "Saving…" : "Add category"}
        </button>
      </div>

      <div className="category-list">
        <div className="category-list__head">
          <h3>Categories ({isLoading ? "…" : categories.length})</h3>
          <RefreshButton refreshing={isFetching} label="the categories" onRefresh={() => refetch()} />
        </div>

        {isError && <div className="api-state api-state--error">Unable to load categories. Check the API connection.</div>}
        {isLoading && !isError && <div className="api-state">Loading categories…</div>}
        {!isLoading && !isError && !categories.length && (
          <div className="api-state">No categories yet. Add the first one above.</div>
        )}

        {categories.length > 0 && (
          <ul>
            {categories.map((category) => (
              <li key={category.category_id}>
                <strong>{category.category_name}</strong>
                <span>
                  {category.category_id}
                  {category.created_by ? ` · ${category.created_by}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SidePanel>
  );
}
