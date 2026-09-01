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

  // --- AUTH GUARD ---
  client.auth.getSession().then(({ data: { session } }) => {
    if (!session && !window.location.pathname.endsWith('/')) {
      // If we are in /app/ and not logged in, redirect to landing
      if (window.location.pathname.includes('/app/')) {
        window.location.href = '/';
      }
    }
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = '/';
    }
  });
  // ------------------
  window.dispatchEvent(new CustomEvent('flashday:supabase-ready', {
    detail: { client, error: null }
  }));
}
