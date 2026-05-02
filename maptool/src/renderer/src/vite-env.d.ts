/// <reference types="vite/client" />

export type MaptoolApi = {
  resolvePhotosJsonPath: (projectRoot: string) => Promise<string>;
  categoriesLoad: () => Promise<{ id: string; label: string }[]>;
  categoriesSave: (
    list: { id: string; label: string }[],
    photosJsonPath: string | null,
  ) => Promise<void>;
  categoriesReadBesidePhotos: (photosJsonPath: string) => Promise<{ id: string; label: string }[] | null>;
  selectProjectDir: () => Promise<string | null>;
  selectPhotosJson: () => Promise<string | null>;
  selectImageFiles: () => Promise<string[]>;
  readPhotosJson: (filePath: string) => Promise<unknown>;
  readExif: (filePath: string) => Promise<Record<string, unknown> | null>;
  backupAndWriteJson: (filePath: string, data: unknown) => Promise<{ ok: true; backupPath: string }>;
};

declare global {
  interface Window {
    maptool: MaptoolApi;
  }
}
