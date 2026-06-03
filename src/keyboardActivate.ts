import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/** 为 role="button" 的 div 提供 Enter / Space 激活 */
export function onActivateKeyDown(e: ReactKeyboardEvent, action: () => void): void {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    action();
  }
}
