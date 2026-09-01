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

  // Wait for Supabase to finish recovering an OAuth/email-confirmation session.
  // Redirecting after a raw getSession() can race with detectSessionInUrl.
  let initialSessionResolved = false;
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') {
      initialSessionResolved = true;
      if (!session && window.location.pathname.includes('/app/')) window.location.replace('/');
      return;
    }
    if (event === 'SIGNED_OUT' && initialSessionResolved && window.location.pathname.includes('/app/')) {
      window.location.replace('/');
    }
  });

  window.dispatchEvent(new CustomEvent('flashday:supabase-ready', {
    detail: { client, error: null }
  }));
}
