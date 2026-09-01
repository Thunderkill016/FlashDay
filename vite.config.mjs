import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    build: {
      rolldownOptions: {
        input: {
          landing: resolve(import.meta.dirname, 'index.html'),
          app: resolve(import.meta.dirname, 'app/index.html')
        }
      }
    },
    define: {
      __FLASHDAY_SUPABASE_URL__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || ''),
      __FLASHDAY_SUPABASE_PUBLISHABLE_KEY__: JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '')
    }
  };
});
