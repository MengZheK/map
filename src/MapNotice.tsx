import React, { useEffect } from "react";

export default function MapNotice({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="mapNotice" role="status" aria-live="polite">
      <span className="mapNotice__text">{message}</span>
      <button type="button" className="mapNotice__close" onClick={onDismiss} aria-label="关闭提示">
        ✕
      </button>
    </div>
  );
}
