import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'utf8-charset',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Ensure all text responses include UTF-8 charset
          const origSetHeader = res.setHeader.bind(res);
          res.setHeader = (name, value) => {
            if (name.toLowerCase() === 'content-type' && typeof value === 'string' && !value.includes('charset')) {
              if (value.includes('javascript') || value.includes('text/html') || value.includes('text/css') || value.includes('application/json')) {
                value = value + '; charset=utf-8';
              }
            }
            return origSetHeader(name, value);
          };
          next();
        });
      }
    }
  ],
  assetsInclude: ['**/*.wasm'],
  server: {
    fs: {
      allow: ['.']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    historyApiFallback: true,
  },
  publicDir: 'public',
  base: '/',
  build: {
    // SPLIT THE HEAVY LIBRARIES OUT OF THE MAIN BUNDLE.
    //
    // Everything shipped as one ~5.3MB file, so a visitor opening a marketing
    // page still had to download, parse and execute the classroom's video
    // stack, the chart library, the rich-text editor and the 3D viewer before
    // React could mount and fetch anything. The API answers in ~200ms; the wait
    // was almost entirely this bundle.
    //
    // Each vendor below is used by a MINORITY of routes, so splitting them:
    //   * keeps them out of the first load for pages that never touch them
    //   * lets the browser cache them across deploys — app code changes far
    //     more often than these do, and today ANY change re-downloads all 5.3MB
    rollupOptions: {
      output: {
        manualChunks: {
          // Video classroom — only /coach/classroom and its student view.
          livekit: ['livekit-client', '@livekit/krisp-noise-filter', '@livekit/track-processors'],
          // Charts — dashboards and reports.
          charts: ['chart.js', 'react-chartjs-2'],
          // Rich-text editor — study/course authoring only.
          editor: ['react-quill'],
          // 3D piece viewer — a single showcase surface.
          modelviewer: ['@google/model-viewer'],
          // Animation library, used across the marketing pages.
          motion: ['framer-motion'],
          // The React core, which every route needs but which almost never
          // changes — a stable long-cache chunk.
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // The warning fired on every build; the real limit is what a page needs on
    // first load, which the split above is what actually addresses.
    chunkSizeWarningLimit: 1200,
  },
  // Strip all console.* and debugger statements from the PRODUCTION bundle only.
  // Dev (`vite`/serve) keeps logs for debugging; deployed users get a clean
  // browser console with no internal details exposed.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
}))
