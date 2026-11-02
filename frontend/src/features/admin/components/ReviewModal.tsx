"use client";

import { useEffect, type ReactNode } from "react";
import { formatStatusLabel } from "../models/formatStatusLabel";

type ReviewModalProps = {
  title: string;
  subtitle?: string;
  status?: string;
  /** Replaces the default status pill, e.g. for status-specific colours. */
  statusBadge?: ReactNode;
  /** Narrow dialog with a single-column body, for short detail lists. */
  compact?: boolean;
  /** Read-only dialogs: a click anywhere, inside the card too, closes it. */
  closeOnAnyClick?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * Large review dialog: fixed header and footer, scrolling content in between,
 * full screen on phones. Used for approving registrations and profile edits.
 */
export function ReviewModal({ title, subtitle, status, statusBadge, compact, closeOnAnyClick, onClose, children, footer }: ReviewModalProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop review-backdrop" onClick={onClose}>
      <div
        className={`review-modal modal-card--pop${compact ? " review-modal--compact" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={closeOnAnyClick ? undefined : (event) => event.stopPropagation()}
      >
        <header className="review-modal__head">
          <div className="review-modal__title">
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="review-modal__side">
            {statusBadge}
            {!statusBadge && status && (
              <span className={`status-pill${String(status).toLowerCase() === "approved" ? " status-pill--live" : ""}`}>
                <i />
                {formatStatusLabel(status)}
              </span>
            )}
            <button type="button" className="review-close" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </header>

        <div className="review-modal__body">{children}</div>

        <footer className="review-modal__foot">{footer}</footer>
      </div>
    </div>
  );
}
