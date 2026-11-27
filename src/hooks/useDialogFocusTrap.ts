import { useEffect, useRef, RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocusTrap(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  fallbackFocusElementId?: string
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && container.contains(active) && active.offsetParent !== null) {
        return;
      }
      const focusables = (
        Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]
      ).filter((el) => el.offsetParent !== null);
      (focusables[0] || container).focus();
    }, 30);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const focusables = (
        Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      const prev = previousFocusRef.current;
      if (
        prev &&
        typeof prev.focus === "function" &&
        document.contains(prev) &&
        prev.offsetParent !== null
      ) {
        prev.focus();
      } else if (fallbackFocusElementId) {
        document.getElementById(fallbackFocusElementId)?.focus();
      }
    };
  }, [isOpen, containerRef, fallbackFocusElementId]);
}
