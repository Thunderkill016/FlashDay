import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const landingEntry = resolve(import.meta.dirname, 'index.html');
  return {
    base: './',
    plugins: [
      {
        name: 'flashday-landing-auth-entry',
        transformIndexHtml(html, ctx) {
          if (ctx?.filename !== landingEntry || html.includes('landing-auth.mjs')) return html;
          return {
            html,
            tags: [
              {
                tag: 'script',
                attrs: { type: 'module', src: './landing-auth.mjs' },
                injectTo: 'body'
              }
            ]
          };
        }
      }
    ],
    build: {
      rolldownOptions: {
        input: {
          landing: landingEntry,
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
