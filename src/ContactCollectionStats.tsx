import React, { useMemo } from "react";
import { collectionStatItems, computeCollectionStats } from "./collectionStats";
import type { Photo } from "./photoUtils";

export default function ContactCollectionStats({
  photos,
  loading,
  catalogUpdatedAt,
}: {
  photos: Photo[];
  loading: boolean;
  catalogUpdatedAt: Date | null;
}) {
  const stats = useMemo(
    () => computeCollectionStats(photos, catalogUpdatedAt),
    [photos, catalogUpdatedAt],
  );
  const items = useMemo(() => collectionStatItems(stats, loading), [stats, loading]);

  return (
    <section className="contactStats" aria-labelledby="collection-stats-heading">
      <div className="contactStatsHead">
        <h2 id="collection-stats-heading" className="contactStatsTitle">
          作品集一览
        </h2>
        <p className="contactStatsSub">
          {loading ? "正在同步相册数据…" : "截至当前公开相册的汇总数据"}
        </p>
      </div>
      <ul className="contactStatsGrid">
        {items.map((item) => (
          <li
            key={item.key}
            className={
              "contactStatsCell" +
              (item.lines ? " contactStatsCell--multiline" : "") +
              (item.nowrap ? " contactStatsCell--nowrap" : "") +
              (item.key === "updated" ? " contactStatsCell--updated" : "")
            }
          >
            <span className="contactStatsLabel">{item.label}</span>
            <span className="contactStatsValueRow">
              {item.lines ? (
                <span className="contactStatsValue contactStatsValue--stack">
                  {item.lines.map((line) => (
                    <span key={line} className="contactStatsLine">
                      {line}
                    </span>
                  ))}
                </span>
              ) : (
                <span
                  className={
                    "contactStatsValue" + (item.nowrap ? " contactStatsValue--nowrap" : "")
                  }
                >
                  {item.value}
                </span>
              )}
              {item.hint ? <span className="contactStatsHint">{item.hint}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
