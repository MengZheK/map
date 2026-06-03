import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

/** 打开 dialog 时聚焦首元素、Tab 循环、关闭后还原焦点 */
export function useDialogFocus(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusInitial = () => {
      const target = initialFocusRef?.current ?? getFocusable(container)[0];
      target?.focus();
    };
    focusInitial();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = getFocusable(container);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, containerRef, initialFocusRef]);
}
