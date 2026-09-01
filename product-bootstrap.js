import { createClient } from '@supabase/supabase-js';

const url = __FLASHDAY_SUPABASE_URL__;
const publishableKey = __FLASHDAY_SUPABASE_PUBLISHABLE_KEY__;

if (!url || !publishableKey) {
  window.dispatchEvent(new CustomEvent('flashday:supabase-ready', {
    detail: { client: null, error: 'Thiếu Supabase public configuration.' }
  }));
} else {
  const client = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
  window.dispatchEvent(new CustomEvent('flashday:supabase-ready', {
    detail: { client, error: null }
  }));
}
