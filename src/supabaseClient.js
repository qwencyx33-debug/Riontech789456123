import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://shaqyighcpkzelxgkouv.supabase.co';
const supabaseAnonKey = 'sb_publishable_vEJhXuVbk32TyT6B6OPhUA_3sgU3hf_';

const tabStorageKey = 'riontech-supabase-tab-id';
const defaultAuthStorageKey = 'supabase.auth.token';

function getTabAuthStorageKey() {
  let tabId = window.sessionStorage.getItem(tabStorageKey);

  if (!tabId) {
    tabId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(tabStorageKey, tabId);

    // Preserve a session created before per-tab storage keys were introduced.
    const existingSession = window.sessionStorage.getItem(defaultAuthStorageKey);
    if (existingSession) {
      window.sessionStorage.setItem(`${defaultAuthStorageKey}.${tabId}`, existingSession);
    }
  }

  return `${defaultAuthStorageKey}.${tabId}`;
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      storage: window.sessionStorage,
      storageKey: getTabAuthStorageKey(),
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
