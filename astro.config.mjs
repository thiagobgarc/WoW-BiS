// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

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