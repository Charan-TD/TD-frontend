"use client";

import { useEffect, useRef, useState } from "react";

import { RefreshButton } from "../../admin/components/RefreshButton";
import { SidePanel } from "../../admin/components/SidePanel";
import { disabledReason } from "../../admin/models/disabledReason";
import { useCreateAdminCategoryMutation, useGetAdminCategoriesQuery } from "../api/categoriesApi";

const NAME_MAX = 150;
const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

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
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
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

  const clearImage = () => {
    setImage(null);
    setFileInputKey((key) => key + 1);
  };

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

        <div className="station-picker-slot image-field">
          <span className="image-field__label">Category image *</span>
          <input
            key={fileInputKey}
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="image-field__input"
            onChange={(event) => setImage(event.target.files?.[0] ?? null)}
            disabled={saving}
          />

          {image && preview && !imageError ? (
            <div className="image-field__chosen">
              <img src={preview} alt="Selected category" />
              <div className="image-field__meta">
                <strong title={image.name}>{image.name}</strong>
                <span>{formatSize(image.size)}</span>
                <div className="image-field__actions">
                  <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()} disabled={saving}>
                    Change
                  </button>
                  <button type="button" className="secondary-button" onClick={clearImage} disabled={saving}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`image-field__drop ${dragging ? "is-dragging" : ""} ${showError && imageError ? "has-error" : ""}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) setImage(file);
              }}
              disabled={saving}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.6" />
                <path d="m21 15-4.5-4.5L6 21" />
              </svg>
              <strong>Click to upload or drag an image here</strong>
              <span>JPG, PNG or WEBP, up to 2 MB</span>
            </button>
          )}

          {showError && imageError && <small className="field-error" role="alert">{imageError}</small>}
        </div>
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
