import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("maptool", {
  resolvePhotosJsonPath: (projectRoot: string): Promise<string> =>
    ipcRenderer.invoke("resolve-photos-json-path", projectRoot),
  categoriesLoad: (): Promise<{ id: string; label: string }[]> => ipcRenderer.invoke("categories-load"),
  categoriesSave: (
    list: { id: string; label: string }[],
    photosJsonPath: string | null,
  ): Promise<void> => ipcRenderer.invoke("categories-save", { list, photosJsonPath }),
  categoriesReadBesidePhotos: (photosJsonPath: string): Promise<{ id: string; label: string }[] | null> =>
    ipcRenderer.invoke("categories-read-beside-photos", photosJsonPath),
  selectProjectDir: (): Promise<string | null> => ipcRenderer.invoke("select-project-dir"),
  selectPhotosJson: (): Promise<string | null> => ipcRenderer.invoke("select-photos-json"),
  selectImageFiles: (): Promise<string[]> => ipcRenderer.invoke("select-image-files"),
  readPhotosJson: (filePath: string): Promise<unknown> => ipcRenderer.invoke("read-photos-json", filePath),
  readExif: (filePath: string): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke("read-exif", filePath),
  backupAndWriteJson: (
    filePath: string,
    data: unknown,
  ): Promise<{ ok: true; backupPath: string }> =>
    ipcRenderer.invoke("backup-and-write-json", { filePath, data }),
});
