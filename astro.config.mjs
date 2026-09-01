// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// Vite's dev server deliberately does NOT copy .env values into process.env
// (only into import.meta.env), but our server-side code reads process.env
// directly (auth.ts, cache.ts, db/client.ts, mock.ts) so it works unchanged
// against real process.env in production (Vercel injects it natively there).
// Backfill anything .env provides that isn't already set, so local `astro
// dev` behaves the same way.
const fileEnv = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
for (const [key, value] of Object.entries(fileEnv)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [react()],
  // The dev toolbar's fixed-position overlay was intermittently swallowing
  // Playwright clicks on elements underneath it (silently — no console error,
  // no exception) with no effect on production. Dev-only convenience, not
  // worth the flake; re-enable locally if you want it (astro.build/config#devtoolbar).
  devToolbar: { enabled: false },

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel()
});