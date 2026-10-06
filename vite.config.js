import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' keeps asset URLs relative so the build works on GitHub Pages
// (same behavior CRA's "homepage": "." provided).
export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
