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
//
// '/' IS prerendered. It was excluded while the app used hydrateRoot: the
// homepage's data-driven parts (live contests, testimonials) can't be fetched at
// build time because prerender aborts all API calls, so the snapshot didn't
// match the client's first render and React threw #418/#423/#425. main.jsx no
// longer hydrates — it clears #root and does a clean createRoot render — so a
// snapshot that differs from the client render is harmless by construction.
//
// Prerendering '/' matters because the homepage is what an AI assistant reads
// when someone asks about chessnexus.in. Without it the crawler got an empty
// <div id="root"> and no meta description, so the product's core facts (free
// forever up to 30 students, the built-in classroom, fee tracking) were
// invisible no matter what the page said. The data-driven sections degrade
// safely at build time: contests render "No schedule" rows and testimonials
// fall back to the built-in quotes. Everything an AI needs is static copy.
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
  '/chess-practice-streak',
  '/chess-coaching',
  '/free-chess-coaching-software',
  '/founding-chess-coaches',
  '/chess-coach-guide',
  '/chess-coach-pricing',
  '/chess-coach-referral',
  '/chess-coaching-questions',
  '/chess-academy-software',
  '/chess-academy-pricing',
  '/live-chess-classroom',
  '/chess-endgame-training',
  '/chess-opening-repertoire',
  '/chess-courses',
  '/chess-progress-reports',
  '/3d-chess-arena-tournament',
  '/chess-study',
  '/chess-community',
  // Public, content-stable app pages. Verified logged-out: each renders real
  // standalone content (2.6k–3.7k chars) rather than redirecting to /login or
  // rendering an empty data-driven shell — unlike /clubs, /public-studies,
  // /daily-puzzles and /invite, which all bounce to /login and would be
  // soft-404s if indexed.
  '/members',
  '/buy-coffee',
  '/contest-rules',
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

  // Mark this as the prerender environment BEFORE any app script runs. Layouts
  // that upgrade to interactive chrome after mount (e.g. MarketingLayout adding
  // the auth/viewport-dependent sidebar) read this flag and skip that upgrade,
  // so the snapshot captures the deterministic PRE-mount markup. That markup
  // matches every real client's first render, so hydration never mismatches
  // (previously caused React #418/#423/#425 on the public pages).
  await page.addInitScript(() => { window.__PRERENDER__ = true; });

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
      // Wait for BOTH the app to paint AND react-helmet-async to write the
      // per-page <link rel="canonical"> into the head.
      //
      // Waiting on #root alone is a race. Helmet flushes its head mutations in
      // an effect AFTER the first paint, so a snapshot taken the instant #root
      // fills can capture index.html's default head — whose canonical points at
      // '/'. Google then folds the page into the homepage as a duplicate and
      // never indexes it. Pages under MarketingLayout happened to win this race;
      // /members (UserLayout) lost it, shipping the homepage's canonical AND
      // description. Depending on paint order for correctness is not something
      // to leave in place, so wait for the actual tag.
      await page.waitForFunction(
        () => {
          const root = document.getElementById('root');
          if (!root || root.children.length === 0) return false;
          const link = document.querySelector('link[rel="canonical"]');
          // '/' legitimately carries the site-root canonical; every other route
          // must have had it rewritten away from the default before we snapshot.
          return !!link && (location.pathname === '/' || !link.href.replace(/\/$/, '').endsWith('chessnexus.in'));
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
