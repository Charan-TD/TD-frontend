"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

type Kind = "access" | "info";
type IconName = Parameters<typeof Icon>[0]["name"];

type ActiveTip = {
  target: HTMLElement;
  text: string;
  kind: Kind;
  icon?: IconName;
};

type Position = {
  top: number;
  left: number;
  arrowLeft: number;
  placement: "top" | "bottom";
};

const GAP = 10;
const EDGE = 8;

/**
 * One app-wide tooltip for anything marked with `data-tooltip`.
 *
 * It replaces the browser's plain `title` box, which looks out of place and
 * often doesn't appear on disabled buttons. Add `data-tooltip-kind="access"`
 * when the reason is that the person's role doesn't allow the action; the
 * tooltip then shows a lock and a "No access" heading. `data-tooltip-icon`
 * swaps the default help icon for another Icon name (e.g. the button's own).
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<ActiveTip | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const currentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const read = (target: HTMLElement): ActiveTip | null => {
      const text = target.dataset.tooltip;
      if (!text) return null;
      return {
        target,
        text,
        kind: target.dataset.tooltipKind === "access" ? "access" : "info",
        icon: target.dataset.tooltipIcon as IconName | undefined,
      };
    };

    const hide = () => {
      currentRef.current = null;
      setTip(null);
    };

    const showFor = (event: Event) => {
      const target = (event.target as Element | null)?.closest?.("[data-tooltip]") as HTMLElement | null;
      if (target === currentRef.current) return;
      currentRef.current = target;
      setTip(target ? read(target) : null);
    };

    // The tooltip text can change, or its button can disappear, while the
    // pointer is still on it (e.g. a save finishes). Keep it in sync.
    const observer = new MutationObserver(() => {
      const target = currentRef.current;
      if (!target) return;
      if (!target.isConnected) {
        hide();
        return;
      }
      const next = read(target);
      setTip((current) => (next && current?.text === next.text && current.kind === next.kind && current.icon === next.icon ? current : next));
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-tooltip", "data-tooltip-kind", "data-tooltip-icon"],
    });

    const root = document.documentElement;
    document.addEventListener("pointerover", showFor);
    document.addEventListener("focusin", showFor);
    document.addEventListener("focusout", hide);
    document.addEventListener("pointerdown", hide);
    root.addEventListener("pointerleave", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);

    return () => {
      observer.disconnect();
      document.removeEventListener("pointerover", showFor);
      document.removeEventListener("focusin", showFor);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("pointerdown", hide);
      root.removeEventListener("pointerleave", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  useLayoutEffect(() => {
    if (!tip || !bubbleRef.current) {
      setPosition(null);
      return;
    }

    const anchor = tip.target.getBoundingClientRect();
    const bubble = bubbleRef.current.getBoundingClientRect();
    const center = anchor.left + anchor.width / 2;

    const fitsAbove = anchor.top - bubble.height - GAP >= EDGE;
    const placement = fitsAbove ? "top" : "bottom";
    const top = fitsAbove ? anchor.top - bubble.height - GAP : anchor.bottom + GAP;

    const maxLeft = window.innerWidth - bubble.width - EDGE;
    const left = Math.min(Math.max(center - bubble.width / 2, EDGE), Math.max(maxLeft, EDGE));
    const arrowLeft = Math.min(Math.max(center - left, 14), bubble.width - 14);

    setPosition({ top, left, arrowLeft, placement });
  }, [tip]);

  if (!tip) return null;

  return (
    <div
      ref={bubbleRef}
      role="tooltip"
      className={`app-tooltip app-tooltip--${tip.kind} app-tooltip--${position?.placement ?? "top"}`}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <span className="app-tooltip__icon" aria-hidden="true">
        <Icon name={tip.kind === "access" ? "lock" : tip.icon ?? "help"} size={13} />
      </span>
      <span className="app-tooltip__body">
        {tip.kind === "access" && <strong>No access</strong>}
        <span>{tip.text}</span>
      </span>
      <span className="app-tooltip__arrow" style={{ left: position?.arrowLeft ?? 0 }} aria-hidden="true" />
    </div>
  );
}
