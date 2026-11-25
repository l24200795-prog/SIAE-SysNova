/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, p. ej. http://localhost:3000/api/v1 (ver .env.example). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
