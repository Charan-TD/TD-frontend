"use client";

import type { ReactNode } from "react";

type Props = {
    open: boolean;
    onClose: () => void;
    eyebrow?: string;
    title: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    /**
     * Renders this panel above another already-open side panel
     * (e.g. "Configure permissions" opened from inside "Add employee").
     */
    elevated?: boolean;
    widthVariant?: "default" | "wide";
    closeDisabled?: boolean;
};

/**
 * Right-side sliding drawer.
 *
 * Used instead of the centered `modal-backdrop` pop-up so admin
 * workflows (add employee, configure permissions) open as an
 * in-context panel rather than a blocking dialog.
 */
export function SidePanel({
    open,
    onClose,
    eyebrow,
    title,
    description,
    children,
    footer,
    elevated = false,
    widthVariant = "default",
    closeDisabled = false,
}: Props) {
    if (!open) return null;

    const handleBackdropClose = () => {
        if (closeDisabled) return;
        onClose();
    };

    return (
        <div
            className={`side-panel-backdrop ${elevated ? "side-panel-backdrop--elevated" : ""}`}
            role="presentation"
            onMouseDown={handleBackdropClose}
        >
            <aside
                className={`side-panel ${widthVariant === "wide" ? "side-panel--wide" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="side-panel-header">
                    <div>
                        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                        <h3>{title}</h3>
                        {description && <p>{description}</p>}
                    </div>

                    <button type="button" className="icon-close" onClick={onClose} aria-label="Close" disabled={closeDisabled}>
                        ×
                    </button>
                </div>

                <div className="side-panel-body">{children}</div>

                {footer && <div className="side-panel-footer">{footer}</div>}
            </aside>
        </div>
    );
}
