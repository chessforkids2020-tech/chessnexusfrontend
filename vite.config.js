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
  // Strip all console.* and debugger statements from the PRODUCTION bundle only.
  // Dev (`vite`/serve) keeps logs for debugging; deployed users get a clean
  // browser console with no internal details exposed.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
}))
