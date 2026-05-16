import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";
import { readPhotoMetadata } from "./readExifPipeline";
import { parseSpreadsheetUrlFile } from "./parseSpreadsheetFile";
import { parsePhotosJsonText } from "../shared/readPhotosJson";
import { DEFAULT_CATEGORIES, type CategoryRow } from "../shared/photoTypes";

const __mainDir = dirname(fileURLToPath(import.meta.url));

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 880,
    minHeight: 600,
    title: "相册清单工具",
    webPreferences: {
      /* electron-vite 构建产出为 preload/index.mjs */
      preload: join(__mainDir, "../preload/index.mjs"),
      contextIsolation: true,
      sandbox: false,
    },
    backgroundColor: "#e8e8ed",
    show: false,
  });

  win.once("ready-to-show", () => win.show());

  if (process.env["ELECTRON_RENDERER_URL"]) {
    win.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    win.loadFile(join(__mainDir, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("resolve-photos-json-path", (_e, projectRoot: string) => {
  return join(projectRoot, "public", "photos", "photos.json");
});

ipcMain.handle("select-project-dir", async () => {
  const r = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (r.canceled || r.filePaths.length === 0) return null;
  return r.filePaths[0]!;
});

ipcMain.handle("select-photos-json", async () => {
  const r = await dialog.showOpenDialog({
    title: "选择 photos.json",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (r.canceled || r.filePaths.length === 0) return null;
  return r.filePaths[0]!;
});

function categoriesFilePath(): string {
  return join(app.getPath("userData"), "maptool-categories.json");
}

ipcMain.handle("categories-load", async (): Promise<CategoryRow[]> => {
  try {
    const raw = await readFile(categoriesFilePath(), "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter(
        (x): x is CategoryRow =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as CategoryRow).id === "string" &&
          typeof (x as CategoryRow).label === "string",
      );
    }
  } catch {
    /* 首次运行 */
  }
  return [...DEFAULT_CATEGORIES];
});

ipcMain.handle(
  "categories-save",
  async (
    _e,
    payload: { list: CategoryRow[]; photosJsonPath: string | null },
  ) => {
    const { list, photosJsonPath } = payload;
    await mkdir(dirname(categoriesFilePath()), { recursive: true });
    await writeFile(categoriesFilePath(), JSON.stringify(list, null, 2), "utf-8");
    if (photosJsonPath && photosJsonPath.trim() !== "") {
      const sidecar = join(dirname(photosJsonPath), "categories.json");
      await mkdir(dirname(sidecar), { recursive: true });
      await writeFile(sidecar, JSON.stringify(list, null, 2), "utf-8");
    }
  },
);

ipcMain.handle(
  "categories-read-beside-photos",
  async (_e, photosJsonPath: string): Promise<CategoryRow[] | null> => {
    try {
      const sidecar = join(dirname(photosJsonPath), "categories.json");
      const raw = await readFile(sidecar, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      const rows = parsed.filter(
        (x): x is CategoryRow =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as CategoryRow).id === "string" &&
          typeof (x as CategoryRow).label === "string",
      );
      return rows.length > 0 ? rows : null;
    } catch {
      return null;
    }
  },
);

ipcMain.handle("select-spreadsheet", async () => {
  const r = await dialog.showOpenDialog({
    title: "选择 Excel 表格（file / url 列）",
    properties: ["openFile"],
    filters: [
      { name: "表格", extensions: ["xlsx", "xls", "csv"] },
      { name: "所有文件", extensions: ["*"] },
    ],
  });
  if (r.canceled || r.filePaths.length === 0) return null;
  return r.filePaths[0]!;
});

ipcMain.handle("parse-spreadsheet-urls", async (_e, filePath: string) => {
  return parseSpreadsheetUrlFile(filePath);
});

ipcMain.handle("select-image-files", async () => {
  const r = await dialog.showOpenDialog({
    title: "选择照片（可多选）",
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "常见图片",
        extensions: [
          "jpg",
          "jpeg",
          "jpe",
          "png",
          "webp",
          "gif",
          "bmp",
          "tif",
          "tiff",
          "heic",
          "heif",
          "avif",
          "jxl",
          "cr2",
          "nef",
          "arw",
          "dng",
          "orf",
          "rw2",
        ],
      },
      { name: "所有文件", extensions: ["*"] },
    ],
  });
  if (r.canceled) return [] as string[];
  return r.filePaths;
});

ipcMain.handle("read-photos-json", async (_e, filePath: string) => {
  const raw = await readFile(filePath, "utf-8");
  return parsePhotosJsonText(raw);
});

ipcMain.handle("read-exif", async (_e, filePath: string) => {
  const buf = await readFile(filePath);
  return readPhotoMetadata(buf, filePath);
});

export type WritePayload = { filePath: string; data: unknown };

ipcMain.handle("backup-and-write-json", async (_e, payload: WritePayload) => {
  const { filePath, data } = payload;
  if (!Array.isArray(data)) {
    throw new Error("photos.json 必须为数组，拒绝写入");
  }
  const json = JSON.stringify(data, null, 2);
  const backupPath = filePath + ".bak";
  try {
    await copyFile(filePath, backupPath);
  } catch {
    /* 首次创建可能不存在 */
  }
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, json, "utf-8");
  return { ok: true as const, backupPath };
});
