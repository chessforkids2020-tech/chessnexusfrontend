/**
 * Static prerendering for the public / SEO-facing pages.
 *
 * After `vite build` produces the SPA in dist/, this script boots that build
 * with a tiny static server, drives a headless Chromium (from Playwright, which
 * is already a devDependency) to each public route, waits for React +
 * react-helmet-async to finish, and writes the fully-rendered HTML back into
 * dist/<route>/index.html.
 *
 * The result: crawlers receive real HTML (unique <title>, meta, headings, copy,
 * JSON-LD) instead of an empty <div id="root">. The app still hydrates into a
 * normal SPA on load, so users notice nothing.
 *
 * Only content-stable, auth-free, param-free public routes are prerendered.
 * Everything else keeps the SPA fallback (see vercel.json).
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = 5055;

// Public routes worth prerendering. No auth, no :params, content-stable.
const ROUTES = [
  '/',
  '/features',
  '/chess-puzzles',
  '/chess-tactics-race',
  '/play-chess-online',
  '/play-chess-with-friends',
  '/masters-chess-games',
  '/analyse-my-chess-game',
  '/improve-at-chess',
  '/3d-chess-arena-tournament',
  '/chess-study',
  '/chess-community',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/refund-policy',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

// Minimal static server over dist/ with SPA fallback to index.html, so the
// router can resolve any route we visit during prerendering.
function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent(req.url.split('?')[0]);
        let filePath = join(DIST, urlPath);
        if (urlPath.endsWith('/')) filePath = join(filePath, 'index.html');

        if (!existsSync(filePath) || extname(filePath) === '') {
          // No matching asset -> serve the SPA shell so React Router handles it.
          filePath = join(DIST, 'index.html');
        }
        const body = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function run() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html not found — run `vite build` first.');
    process.exit(1);
  }

  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Prerendering is for static marketing HTML — it must NEVER call the live
  // backend. Abort any API / socket / external data request so builds don't
  // spam production (CORS errors, junk analytics) and don't hang on network.
  await page.route('**/*', (routeReq) => {
    const u = routeReq.request().url();
    const isLocalAsset = u.startsWith(`http://localhost:${PORT}`);
    const isApi = /\/api\/|\/socket\.io\/|\/studysparring/.test(u);
    if (!isLocalAsset || isApi) {
      return routeReq.abort();
    }
    return routeReq.continue();
  });

  let ok = 0;
  for (const route of ROUTES) {
    const url = `http://localhost:${PORT}${route}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Ensure React has painted real content into #root.
      await page.waitForFunction(
        () => {
          const root = document.getElementById('root');
          return root && root.children.length > 0;
        },
        { timeout: 15000 }
      );

      // Grab the fully-rendered document, including the <head> helmet mutated.
      const html = '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML));

      const outDir = route === '/' ? DIST : join(DIST, route);
      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, 'index.html'), html, 'utf-8');
      ok++;
      console.log(`[prerender] ✓ ${route}`);
    } catch (err) {
      console.error(`[prerender] ✗ ${route} — ${err.message}`);
    }
  }

  await browser.close();
  server.close();
  console.log(`[prerender] done: ${ok}/${ROUTES.length} routes rendered.`);
  if (ok < ROUTES.length) process.exit(1);
}

run();
