import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import siteConfig from './site.config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
    allowedHosts: ['test.jens-photo.com'],
  },
});
