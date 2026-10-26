import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// On Vercel, tag Sentry events with the deployed commit unless a release is set explicitly.
process.env.VITE_SENTRY_RELEASE ||= process.env.VERCEL_GIT_COMMIT_SHA ?? '';

// Source maps are uploaded to Sentry only when a token is configured (e.g. in Vercel's settings).
// They are not published with the site: the plugin deletes them after the upload.
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default defineConfig({
  plugins: [
    react(),
    uploadSourceMaps &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: process.env.VITE_SENTRY_RELEASE || undefined },
        sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
        telemetry: false,
      }),
  ],
  server: { port: 5173 },
  build: {
    sourcemap: uploadSourceMaps ? 'hidden' : false,
    rollupOptions: {
      output: {
        // Libraries change far less often than app code, so they get their own long-cached files.
        manualChunks: {
          react: ['react', 'react-dom', 'zustand', 'i18next', 'react-i18next'],
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
