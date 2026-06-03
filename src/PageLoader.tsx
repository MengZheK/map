import React from "react";

export default function PageLoader({ message = "加载中…" }: { message?: string }) {
  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      {message}
    </div>
  );
}
