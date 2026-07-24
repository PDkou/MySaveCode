/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Badging API -- not yet in TypeScript's built-in DOM lib. Supported on
// Android/desktop Chrome & Edge for installed PWAs; simply absent
// (undefined) everywhere else, including iOS Safari.
interface Navigator {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}
