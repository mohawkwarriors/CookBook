import { useEffect } from "react";

let activeLocks = 0;
let savedBodyPaddingRight: string | null = null;

function lockBodyScroll() {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  if (activeLocks === 0) {
    const html = document.documentElement;
    const body = document.body;
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    savedBodyPaddingRight = body.style.paddingRight;
    if (scrollbarWidth > 0) {
      const computedPadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${computedPadding + scrollbarWidth}px`;
    }

    html.classList.add("modal-scroll-lock");
    body.classList.add("modal-scroll-lock");
  }

  activeLocks += 1;
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;

  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks === 0) {
    const html = document.documentElement;
    const body = document.body;

    html.classList.remove("modal-scroll-lock");
    body.classList.remove("modal-scroll-lock");

    if (savedBodyPaddingRight !== null) {
      body.style.paddingRight = savedBodyPaddingRight;
      savedBodyPaddingRight = null;
    }
  }
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [locked]);
}
