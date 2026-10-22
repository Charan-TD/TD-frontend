"use client";

import { useEffect, useState } from "react";

import { RefreshButton } from "../../admin/components/RefreshButton";
import { SidePanel } from "../../admin/components/SidePanel";
import { disabledReason } from "../../admin/models/disabledReason";
import { useCreateAdminCategoryMutation, useGetAdminCategoriesQuery } from "../api/categoriesApi";

const NAME_MAX = 150;
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Same rules as the server: JPG, PNG or WEBP, up to 2 MB. */
const imageProblem = (file: File | null): string | undefined => {
  if (!file) return "Category image is required";
  if (!IMAGE_TYPES.includes(file.type)) return "Image must be a JPG, PNG or WEBP file";
  if (file.size > IMAGE_MAX_BYTES) return "Image must be smaller than 2 MB";
  return undefined;
};

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
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [showError, setShowError] = useState(false);
  const [formError, setFormError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const trimmed = name.trim();
  const nameError = !trimmed ? "Category name is required" : undefined;
  const imageError = imageProblem(image);
  const saveBlocked = disabledReason([saving, "Saving the category…"]);

  // Preview of the chosen image; the object URL is released when it changes.
  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const resetForm = () => {
    setName("");
    setImage(null);
    setFileInputKey((key) => key + 1);
    setShowError(false);
  };

  const close = () => {
    if (saving) return;
    setName("");
    setImage(null);
    setFileInputKey((key) => key + 1);
    setShowError(false);
    setFormError("");
    setSavedMessage("");
    onClose();
  };

  const submit = async () => {
    setShowError(true);
    setFormError("");
    setSavedMessage("");
    if (nameError || imageError || !image) return;

    const body = new FormData();
    body.append("category_name", trimmed);
    body.append("cat_img_id", image);

    try {
      await createCategory(body).unwrap();
      setSavedMessage(`${trimmed} was added.`);
      resetForm();
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
      title="Add food category"
      description="Create a food category for restaurants. All categories are listed below."
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

        <label className="station-picker-slot">
          <span>Category image *</span>
          <input
            key={fileInputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            disabled={saving}
          />
          {showError && imageError ? (
            <small className="field-error" role="alert">{imageError}</small>
          ) : (
            <small>JPG, PNG or WEBP, up to 2 MB.</small>
          )}
          {preview && !imageProblem(image) && <img className="category-preview" src={preview} alt="Selected category" />}
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
          {saving ? "Saving…" : "Add food category"}
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
                {category.cat_img_url && <img className="category-thumb" src={category.cat_img_url} alt="" />}
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
