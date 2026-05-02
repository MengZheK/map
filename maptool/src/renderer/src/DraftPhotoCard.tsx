import React from "react";
import type { CategoryRow, PhotoEntry } from "../../shared/photoTypes";
import { PHOTO_JSON_FIELD_HELP } from "../../shared/photoFieldLabels";

export type DraftPhoto = {
  key: string;
  localPath: string;
  fileName: string;
  expanded: boolean;
  cosUrl: string;
  categoryId: string;
  description: string;
  partial: Partial<PhotoEntry>;
};

type Props = {
  draft: DraftPhoto;
  categories: CategoryRow[];
  onPatch: (patch: Partial<DraftPhoto>) => void;
  onPartial: (p: Partial<PhotoEntry>) => void;
  onRemoveDraft: () => void;
  onAddOneToQueue: () => void;
};

function str(v: string | null | undefined): string {
  return v ?? "";
}

function numIn(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  return String(Math.round(v * 100) / 100);
}

/** 经纬度保持 EXIF 原始有效数字，不截断到两位 */
function coordIn(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "";
  return String(v);
}

function Opt({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className="fieldOpt">（可选）</span>;
}

function fieldLabel(key: keyof typeof PHOTO_JSON_FIELD_HELP): string {
  return `${key} · ${PHOTO_JSON_FIELD_HELP[key]}`;
}

export default function DraftPhotoCard({
  draft,
  categories,
  onPatch,
  onPartial,
  onRemoveDraft,
  onAddOneToQueue,
}: Props): React.ReactElement {
  const p = draft.partial;
  const gpsOk = p.lat != null && p.lon != null;
  const urlOk = draft.cosUrl.trim().length > 0;

  const onDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("确定从编辑区删除该照片？不会改动已保存的 photos.json。")) {
      onRemoveDraft();
    }
  };

  return (
    <div className={"draftCard " + (draft.expanded ? "draftCard--open" : "")}>
      <div className="draftCard__headerRow">
        <button type="button" className="draftCard__header" onClick={() => onPatch({ expanded: !draft.expanded })}>
          <span className="draftCard__chevron">{draft.expanded ? "▼" : "▶"}</span>
          <span className="draftCard__title">{draft.fileName}</span>
          <span className="draftCard__badges">
            <span className={"draftChip " + (gpsOk ? "draftChip--ok" : "")}>{gpsOk ? "含 GPS" : "无 GPS"}</span>
            <span className={"draftChip " + (urlOk ? "draftChip--ok" : "")}>{urlOk ? "已填链接" : "待填链接"}</span>
          </span>
        </button>
        <button type="button" className="btn btn--danger btn--xs" title="从编辑区移除本张" onClick={onDeleteClick}>
          删除
        </button>
      </div>

      {draft.expanded ? (
        <div className="draftCard__body">
          <p className="iphoneHint">
            <strong>iPhone / HEIC：</strong>
            若自动解析为空，Windows 请安装「HEIF 图像扩展」或先将照片导出为 JPEG；工具会尝试用内置解码读取 EXIF，仍失败时请手动填写下方字段。
          </p>

          <div className="fieldSection">
            <div className="fieldSection__title">写入清单的必填项</div>
            <p className="fieldPara">{PHOTO_JSON_FIELD_HELP.src}</p>
            <label className="field">
              <span>
                {fieldLabel("src")} <span className="fieldReq">（必填）</span>
              </span>
              <input
                className="input"
                placeholder="https://你的COS域名/..."
                value={draft.cosUrl}
                onChange={(e) => onPatch({ cosUrl: e.target.value })}
              />
            </label>
            <label className="field">
              <span>
                {fieldLabel("categoryId")} <Opt />
              </span>
              <select className="select" value={draft.categoryId} onChange={(e) => onPatch({ categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} · {c.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>
                {fieldLabel("description")} <Opt />
              </span>
              <textarea
                className="textarea textarea--sm"
                rows={2}
                placeholder="仅本张照片的说明"
                value={draft.description}
                onChange={(e) => onPatch({ description: e.target.value })}
              />
            </label>
            <p className="fieldPara muted">{PHOTO_JSON_FIELD_HELP.id}</p>
          </div>

          <details className="metaDetails" open>
            <summary className="metaDetails__summary">全部元数据字段（与 photos.json 一致，均可选手填）</summary>
            <div className="metaDetails__inner">
              <fieldset className="fieldset">
                <legend>相机与镜头</legend>
                <div className="fieldGrid">
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.cameraMake}>{fieldLabel("cameraMake")} <Opt /></span>
                    <input
                      className="input"
                      value={str(p.cameraMake)}
                      onChange={(e) => onPartial({ cameraMake: e.target.value || null })}
                    />
                  </label>
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.cameraModel}>{fieldLabel("cameraModel")} <Opt /></span>
                    <input
                      className="input"
                      value={str(p.cameraModel)}
                      onChange={(e) => onPartial({ cameraModel: e.target.value || null })}
                    />
                  </label>
                  <label className="field field--full">
                    <span title={PHOTO_JSON_FIELD_HELP.lensModel}>{fieldLabel("lensModel")} <Opt /></span>
                    <input
                      className="input"
                      value={str(p.lensModel)}
                      onChange={(e) => onPartial({ lensModel: e.target.value || null })}
                    />
                  </label>
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.focalLengthMm}>{fieldLabel("focalLengthMm")} <Opt /></span>
                    <input
                      className="input"
                      value={numIn(p.focalLengthMm)}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        onPartial({ focalLengthMm: t === "" ? null : Number(t) });
                      }}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend>曝光</legend>
                <div className="fieldGrid">
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.aperture}>{fieldLabel("aperture")} <Opt /></span>
                    <input
                      className="input"
                      value={numIn(p.aperture)}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        onPartial({ aperture: t === "" ? null : Number(t) });
                      }}
                    />
                  </label>
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.shutterTime}>{fieldLabel("shutterTime")} <Opt /></span>
                    <input
                      className="input"
                      placeholder="例：1/250s"
                      value={str(p.shutterTime)}
                      onChange={(e) => onPartial({ shutterTime: e.target.value || null })}
                    />
                  </label>
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.iso}>{fieldLabel("iso")} <Opt /></span>
                    <input
                      className="input"
                      value={numIn(p.iso)}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        onPartial({ iso: t === "" ? null : Number(t) });
                      }}
                    />
                  </label>
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.shutterSec}>{fieldLabel("shutterSec")} <Opt /></span>
                    <input
                      className="input"
                      value={numIn(p.shutterSec)}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        onPartial({ shutterSec: t === "" ? null : Number(t) });
                      }}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend>位置</legend>
                <div className="fieldGrid">
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.lat}>{fieldLabel("lat")} <Opt /></span>
                    <input
                      className="input"
                      value={coordIn(p.lat)}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        onPartial({ lat: t === "" ? null : Number(t) });
                      }}
                    />
                  </label>
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.lon}>{fieldLabel("lon")} <Opt /></span>
                    <input
                      className="input"
                      value={coordIn(p.lon)}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        onPartial({ lon: t === "" ? null : Number(t) });
                      }}
                    />
                  </label>
                  <label className="field field--full">
                    <span title={PHOTO_JSON_FIELD_HELP.locationName}>{fieldLabel("locationName")} <Opt /></span>
                    <input
                      className="input"
                      value={str(p.locationName)}
                      onChange={(e) => onPartial({ locationName: e.target.value || null })}
                    />
                  </label>
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.altitudeM}>{fieldLabel("altitudeM")} <Opt /></span>
                    <input
                      className="input"
                      value={numIn(p.altitudeM)}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        onPartial({ altitudeM: t === "" ? null : Number(t) });
                      }}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="fieldset">
                <legend>时间</legend>
                <div className="fieldGrid">
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.takenAt}>{fieldLabel("takenAt")} <Opt /></span>
                    <input
                      className="input"
                      placeholder="YYYY-MM-DD"
                      value={str(p.takenAt)}
                      onChange={(e) => onPartial({ takenAt: e.target.value || null })}
                    />
                  </label>
                  <label className="field">
                    <span title={PHOTO_JSON_FIELD_HELP.takenYear}>{fieldLabel("takenYear")} <Opt /></span>
                    <input
                      className="input"
                      value={p.takenYear != null ? String(p.takenYear) : ""}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        onPartial({ takenYear: t === "" ? null : parseInt(t, 10) });
                      }}
                    />
                  </label>
                </div>
              </fieldset>

              <p className="pathNote">
                <span className="labelInline">本地路径（不入 JSON）</span>
                <code className="pathMono pathMono--sm">{draft.localPath}</code>
              </p>
            </div>
          </details>

          <div className="draftCard__actions">
            <button type="button" className="btn btn--ghost" onClick={onDeleteClick}>
              删除本张照片
            </button>
            <button type="button" className="btn btn--primary" onClick={onAddOneToQueue}>
              将本张加入待保存队列
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
