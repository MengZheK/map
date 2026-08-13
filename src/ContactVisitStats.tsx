import React, { useEffect, useState } from "react";
import { recordSiteVisit, type VisitStats } from "./visitStats";

function formatCount(n: number): string {
  return n.toLocaleString("zh-CN");
}

export default function ContactVisitStats() {
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    recordSiteVisit().then((data) => {
      if (cancelled) return;
      if (data) {
        setStats(data);
        setStatus("ok");
        return;
      }
      setStatus("error");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pv = status === "ok" && stats ? formatCount(stats.sitePv) : status === "error" ? "—" : "…";
  const uv = status === "ok" && stats ? formatCount(stats.siteUv) : status === "error" ? "—" : "…";

  return (
    <section className="contactCard contactCard--visits" aria-labelledby="visit-stats-heading">
      <div className="contactCardIcon contactCardIcon--visits" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 19V11.5M10 19V5M16 19v-7.5M22 19H2"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 id="visit-stats-heading" className="contactCardTitle">
        网站访问量
      </h2>
      <p className="contactCardText">
        {status === "error"
          ? "统计暂时不可用，不影响浏览。稍后刷新即可重试。"
          : "自站点上线以来的累计浏览，同一浏览器计为一位访客。"}
      </p>
      <ul className="contactVisitGrid">
        <li className="contactVisitCell">
          <span className="contactVisitLabel">总访问量</span>
          <span className="contactVisitValue">{pv}</span>
          <span className="contactVisitHint">次浏览</span>
        </li>
        <li className="contactVisitCell">
          <span className="contactVisitLabel">独立访客</span>
          <span className="contactVisitValue">{uv}</span>
          <span className="contactVisitHint">人</span>
        </li>
      </ul>
    </section>
  );
}
