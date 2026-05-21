/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TIANDITU_TK?: string;
  readonly VITE_MAP_BASEMAP_THEME?: string;
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
