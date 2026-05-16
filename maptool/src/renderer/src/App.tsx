import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { CategoryRow, PhotoEntry } from "../../shared/photoTypes";
import { DEFAULT_CATEGORIES } from "../../shared/photoTypes";
import { buildPhotoEntry } from "../../shared/buildPhotoEntry";
import { enrichPartialWithPlaceFromCoords } from "../../shared/enrichPhotoPartial";
import { roundPhotoNumericFields } from "../../shared/roundPhotoNumerics";
import { mergePhotoEntries, nextPhotoId } from "../../shared/mergePhotos";
import { applyUrlMapToDrafts } from "../../shared/parseUrlSpreadsheet";
import DraftPhotoCard, { type DraftPhoto } from "./DraftPhotoCard";

function newDraftKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App(): React.ReactElement {
  const [photosJsonPath, setPhotosJsonPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<PhotoEntry[]>([]);
  const [pending, setPending] = useState<PhotoEntry[]>([]);
  const [drafts, setDrafts] = useState<DraftPhoto[]>([]);

  const [categories, setCategories] = useState<CategoryRow[]>(DEFAULT_CATEGORIES);
  const [newCatId, setNewCatId] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const api = window.maptool;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.categoriesLoad();
        if (!cancelled && list.length > 0) setCategories(list);
      } catch {
        /* 忽略 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const persistCategories = useCallback(
    async (list: CategoryRow[]) => {
      await api.categoriesSave(list, photosJsonPath);
    },
    [api, photosJsonPath],
  );

  const loadFromPath = useCallback(
    async (path: string) => {
      setError(null);
      setInfo(null);
      try {
        const data = await api.readPhotosJson(path);
        if (!Array.isArray(data)) {
          const msg = "photos.json 根类型应为数组";
          setError(msg);
          window.alert(`无法载入清单。\n\n原因：${msg}`);
          return;
        }
        setPhotosJsonPath(path);
        setLoaded(data as PhotoEntry[]);
        try {
          const sidecar = await api.categoriesReadBesidePhotos(path);
          if (sidecar && sidecar.length > 0) setCategories(sidecar);
        } catch {
          /* 无 categories.json 时沿用当前列表 */
        }
        setInfo(`已载入 ${(data as PhotoEntry[]).length} 条记录`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        window.alert(`无法载入 photos.json。\n\n原因：${msg}`);
      }
    },
    [api],
  );

  const onPickProject = async () => {
    const dir = await api.selectProjectDir();
    if (!dir) return;
    const jsonPath = await api.resolvePhotosJsonPath(dir);
    await loadFromPath(jsonPath);
  };

  const onPickJson = async () => {
    const p = await api.selectPhotosJson();
    if (!p) return;
    await loadFromPath(p);
  };

  const defaultCategoryId = categories[0]?.id ?? "asia_explore";

  const onPickImages = async () => {
    setError(null);
    const files = await api.selectImageFiles();
    if (files.length === 0) return;
    const nextDrafts: DraftPhoto[] = [];
    for (const path of files) {
      const fileName = path.split(/[/\\]/).pop() ?? path;
      let partial: Partial<PhotoEntry> = {};
      try {
        partial = ((await api.readExif(path)) as Partial<PhotoEntry>) ?? {};
      } catch {
        partial = {};
      }
      nextDrafts.push({
        key: newDraftKey(),
        localPath: path,
        fileName,
        expanded: true,
        cosUrl: "",
        categoryId: defaultCategoryId,
        description: "",
        partial,
      });
    }
    setDrafts((d) => [...d, ...nextDrafts]);
    setInfo(`已添加 ${nextDrafts.length} 张照片到编辑区，请填写图床链接并核对解析信息。`);
  };

  const onImportExcelUrls = async () => {
    setError(null);
    if (drafts.length === 0) {
      window.alert(
        "请先「选择本地照片」添加到编辑区，再导入 Excel 批量填写链接。\n\n表格需包含表头 file（可为带目录的路径，如 任意文件夹/照片.jpg）与 url（COS 地址），按文件名与编辑区照片匹配。",
      );
      setError("编辑区暂无照片，无法批量填链接");
      return;
    }
    const filePath = await api.selectSpreadsheet();
    if (!filePath) return;
    try {
      const parsed = await api.parseSpreadsheetUrls(filePath);
      if (!parsed.ok) {
        window.alert(`无法读取表格。\n\n原因：${parsed.error}`);
        setError(parsed.error);
        return;
      }
      const { drafts: nextDrafts, result } = applyUrlMapToDrafts(drafts, parsed.map, parsed.pairs);
      setDrafts(nextDrafts);

      const matchedCount = drafts.length - result.unmatchedDrafts.length;
      let msg = `已从表格导入 ${parsed.pairs.length} 条链接；匹配编辑区 ${matchedCount}/${drafts.length} 张`;
      if (result.updated > 0) msg += `，新填写或更新 ${result.updated} 张`;
      if (result.unmatchedDrafts.length > 0) {
        const sample = result.unmatchedDrafts.slice(0, 8).join("、");
        const more =
          result.unmatchedDrafts.length > 8 ? ` 等 ${result.unmatchedDrafts.length} 个` : "";
        msg += `；未在表格中找到：${sample}${more}`;
      }
      if (result.unusedExcelFiles.length > 0) {
        const sample = result.unusedExcelFiles.slice(0, 8).join("、");
        const more = result.unusedExcelFiles.length > 8 ? ` 等 ${result.unusedExcelFiles.length} 条` : "";
        msg += `；表格中未匹配到编辑区照片：${sample}${more}`;
      }
      setInfo(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`读取表格失败。\n\n原因：${msg}`);
      setError(msg);
    }
  };

  const patchDraft = (key: string, patch: Partial<DraftPhoto>) => {
    setDrafts((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  const patchPartial = (key: string, partial: Partial<PhotoEntry>) => {
    setDrafts((list) =>
      list.map((x) => {
        if (x.key !== key) return x;
        const merged = roundPhotoNumericFields({ ...x.partial, ...partial });
        return { ...x, partial: enrichPartialWithPlaceFromCoords(merged) };
      }),
    );
  };

  const removeDraft = (key: string) => {
    setDrafts((list) => list.filter((x) => x.key !== key));
  };

  const addDraftToQueue = (key: string) => {
    setError(null);
    setDrafts((list) => {
      const draft = list.find((x) => x.key === key);
      if (!draft) return list;
      if (!draft.cosUrl.trim()) {
        window.alert(
          "无法将本张加入待保存队列。\n\n原因：未填写图片 URL（COS 链接，对应 photos.json 中的 src 字段）。请先粘贴图床地址后再试。",
        );
        setError("请先填写该照片的 COS 图片 URL");
        return list;
      }
      setPending((pendingNow) => {
        const base = [...loaded, ...pendingNow];
        const id = nextPhotoId(base);
        const entry = buildPhotoEntry(
          id,
          draft.cosUrl.trim(),
          draft.categoryId,
          draft.description,
          draft.partial,
        );
        queueMicrotask(() => setInfo(`已加入待保存队列：${id}`));
        return [...pendingNow, entry];
      });
      return list.filter((x) => x.key !== key);
    });
  };

  const addAllDraftsToQueue = () => {
    setError(null);
    const missing = drafts.filter((d) => !d.cosUrl.trim());
    if (missing.length > 0) {
      window.alert(
        `无法批量加入队列。\n\n原因：仍有 ${missing.length} 张照片未填写图片 URL（src）。请为每张卡片填写 COS 链接后再试。`,
      );
      setError(`尚有 ${missing.length} 张未填写图片 URL，无法批量加入`);
      return;
    }
    let base = [...loaded, ...pending];
    const newEntries: PhotoEntry[] = [];
    const keys = drafts.map((d) => d.key);
    for (const draft of drafts) {
      const id = nextPhotoId(base);
      const entry = buildPhotoEntry(
        id,
        draft.cosUrl.trim(),
        draft.categoryId,
        draft.description,
        draft.partial,
      );
      newEntries.push(entry);
      base = [...base, entry];
    }
    setPending((p) => [...p, ...newEntries]);
    setDrafts((d) => d.filter((x) => !keys.includes(x.key)));
    setInfo(`已将 ${newEntries.length} 张全部加入待保存队列`);
  };

  const onSaveJson = async () => {
    setError(null);
    setInfo(null);
    if (!photosJsonPath) {
      window.alert(
        "无法保存。\n\n原因：尚未载入 photos.json。请先通过左侧「选择网站工程目录」或「直接选择 photos.json」打开清单文件。",
      );
      setError("请先载入 photos.json");
      return;
    }
    if (pending.length === 0) {
      window.alert("当前没有待保存的新增条目。\n\n请先将编辑中的照片加入待保存队列后再保存。");
      setInfo("没有待保存的新增条目");
      return;
    }
    const result = mergePhotoEntries(loaded, pending);
    if (!result.ok) {
      window.alert(`无法合并写入。\n\n原因：${result.error}`);
      setError(result.error);
      return;
    }
    try {
      await api.backupAndWriteJson(photosJsonPath, result.merged);
      setLoaded(result.merged);
      setPending([]);
      let msg = `已保存：新增 ${result.added} 条，合计 ${result.merged.length} 条。已写入备份 .bak`;
      if (result.skippedDuplicateIds.length > 0) {
        msg += `（跳过重复 id：${result.skippedDuplicateIds.join(", ")}）`;
      }
      setInfo(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      window.alert(`保存失败。\n\n原因：${msg}`);
    }
  };

  const removePending = (id: string) => {
    if (!window.confirm("从待保存队列中移除该条？尚未写入 photos.json 时可直接移除。")) return;
    setPending((p) => p.filter((x) => x.id !== id));
  };

  const onAddCategory = async () => {
    setError(null);
    const id = newCatId.trim();
    const label = newCatLabel.trim();
    if (!id || !label) {
      window.alert("无法添加分类。\n\n原因：请同时填写分类 id（英文）与显示名称。");
      setError("请填写分类 id 与显示名称");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(id)) {
      window.alert("无法添加分类。\n\n原因：分类 id 仅允许字母、数字、下划线。");
      setError("分类 id 仅允许字母、数字、下划线");
      return;
    }
    if (categories.some((c) => c.id === id)) {
      window.alert(`无法添加分类。\n\n原因：分类 id「${id}」已存在，请换一个 id。`);
      setError("该分类 id 已存在");
      return;
    }
    const next = [...categories, { id, label }];
    setCategories(next);
    await persistCategories(next);
    setNewCatId("");
    setNewCatLabel("");
    setInfo(`已添加分类：${label}`);
  };

  const onRemoveCategory = async (id: string) => {
    setError(null);
    if (categories.length <= 1) {
      window.alert("无法删除。\n\n原因：至少需要保留一个分类。");
      setError("至少保留一个分类");
      return;
    }
    const next = categories.filter((c) => c.id !== id);
    setCategories(next);
    await persistCategories(next);
    setDrafts((ds) =>
      ds.map((d) => (d.categoryId === id ? { ...d, categoryId: next[0]!.id } : d)),
    );
    setInfo("已删除分类");
  };

  const pendingPreview = useMemo(
    () =>
      pending.map((p) => (
        <div key={p.id} className="pendingItem">
          <div>
            <strong>{p.id}</strong>
            <span className="pendingMeta">
              {p.categoryId} · {p.description ?? "—"}
            </span>
            <div>
              <code>{p.src}</code>
            </div>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => removePending(p.id)}>
            移除
          </button>
        </div>
      )),
    [pending],
  );

  return (
    <div className="appShell">
      <aside className="sidebar">
        <h1>相册清单工具</h1>
        <p className="sub">在本地合并写入 public/photos/photos.json，保存前自动生成 .bak。图片托管于 COS，在此粘贴链接。</p>

        <span className="label">清单文件</span>
        <button type="button" className="btn" onClick={onPickProject}>
          选择网站工程目录
        </button>
        <button type="button" className="btn btn--ghost" onClick={onPickJson}>
          直接选择 photos.json
        </button>
        {photosJsonPath ? (
          <>
            <span className="label">当前路径</span>
            <div className="pathMono">{photosJsonPath}</div>
            <div className="stat">
              已发布 <strong>{loaded.length}</strong> 条 · 待保存 <strong>{pending.length}</strong> 条 · 编辑中{" "}
              <strong>{drafts.length}</strong> 张
            </div>
          </>
        ) : (
          <div className="stat">尚未载入清单</div>
        )}

        <span className="label">自定义分类</span>
        <p className="hint">保存在本机，每条照片单独可选分类。</p>
        <ul className="catList">
          {categories.map((c) => (
            <li key={c.id} className="catList__row">
              <span>
                {c.label} <span className="catList__id">{c.id}</span>
              </span>
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => onRemoveCategory(c.id)}>
                删除
              </button>
            </li>
          ))}
        </ul>
        <div className="catAdd">
          <input
            className="input input--sm"
            placeholder="分类 id（英文）"
            value={newCatId}
            onChange={(e) => setNewCatId(e.target.value)}
          />
          <input
            className="input input--sm"
            placeholder="显示名称"
            value={newCatLabel}
            onChange={(e) => setNewCatLabel(e.target.value)}
          />
          <button type="button" className="btn btn--ghost" onClick={onAddCategory}>
            添加分类
          </button>
        </div>
      </aside>

      <div className="mainCol">
        <div className="glassCard glassCard--strong headBar">
          <div className="row headBar__row">
            <div>
              <span className="headBar__title">新增照片</span>
              <p className="hint headBar__hint">
                可选一张或多张本地文件；也可用 Excel（表头 file、url）批量填写 COS 链接，再核对解析信息。
              </p>
            </div>
            <div className="row">
              <button type="button" className="btn btn--primary" onClick={onPickImages}>
                选择本地照片…
              </button>
              <button
                type="button"
                className="btn"
                onClick={onImportExcelUrls}
                disabled={drafts.length === 0}
                title={
                  drafts.length === 0
                    ? "请先选择本地照片"
                    : "从 Excel 按 file 列匹配（支持带目录路径，按文件名对齐）并填入 url"
                }
              >
                从 Excel 批量填链接…
              </button>
              {drafts.length > 0 ? (
                <>
                  <span className="badge">编辑中 {drafts.length}</span>
                  <button type="button" className="btn" onClick={addAllDraftsToQueue}>
                    将全部编辑中的照片加入队列
                  </button>
                </>
              ) : null}
              {pending.length > 0 ? <span className="badge badge--pending">待保存 {pending.length}</span> : null}
            </div>
          </div>
        </div>

        <div className="draftScroll">
          {drafts.length === 0 ? (
            <div className="glassCard emptyHint">
              <p>点击「选择本地照片」添加一张或多张，支持 JPG、PNG、WebP、GIF、TIFF、HEIC 及常见 RAW；若某种格式无法解析 EXIF，可手动填写下方字段。</p>
            </div>
          ) : (
            drafts.map((d) => (
              <DraftPhotoCard
                key={d.key}
                draft={d}
                categories={categories}
                onPatch={(patch) => patchDraft(d.key, patch)}
                onPartial={(partial) => patchPartial(d.key, partial)}
                onRemoveDraft={() => removeDraft(d.key)}
                onAddOneToQueue={() => addDraftToQueue(d.key)}
              />
            ))
          )}
        </div>

        <div className="glassCard">
          <span className="label">待保存队列</span>
          <p className="hint">写入 photos.json 前合并；仅追加新 id，不会删除已有条目。</p>
          {pending.length === 0 ? (
            <p className="hint">暂无。</p>
          ) : (
            <div className="pendingList">{pendingPreview}</div>
          )}
          <div className="toolbarFooter" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--primary" onClick={onSaveJson} disabled={!photosJsonPath || pending.length === 0}>
              保存到 photos.json（先备份 .bak）
            </button>
          </div>
        </div>

        {error ? <div className="glassCard err">{error}</div> : null}
        {info ? (
          <div className="glassCard infoBanner">{info}</div>
        ) : null}
      </div>
    </div>
  );
}
