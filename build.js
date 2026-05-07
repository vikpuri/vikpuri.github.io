/**
 * build.js — Requation deploy prep
 * Reads SUPABASE_KEY + MAPBOX_TOKEN from env (or .env file),
 * injects them into HTML source files, writes output to dist/.
 */
const fs   = require('fs');
const path = require('path');

// ── Load .env for local development ──────────────────────────────
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0 && !line.startsWith('#')) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

const SB_KEY    = process.env.SUPABASE_KEY;
const GA_ID     = process.env.GA_ID     || '';   // GA4 Measurement ID — empty = analytics off
const GSC_TOKEN = process.env.GSC_TOKEN || '';   // Google Search Console verification token

if (!SB_KEY) {
  console.warn('WARN: SUPABASE_KEY not set — key already embedded in source files, continuing build');
}
if (!GA_ID)     console.warn('WARN: GA_ID not set — Google Analytics 4 will not record traffic until env is set in Vercel');
if (!GSC_TOKEN) console.warn('WARN: GSC_TOKEN not set — Google Search Console verification will fail until env is set in Vercel');

// ── Helpers ───────────────────────────────────────────────────────
function inject(str) {
  return str
    .split('__SB_KEY__').join(SB_KEY)
    .split('__GA_ID__').join(GA_ID)
    .split('__GSC_TOKEN__').join(GSC_TOKEN);
}

function copyItem(src, dst) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    fs.readdirSync(src).forEach(f => copyItem(path.join(src, f), path.join(dst, f)));
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

// ── Clean + create dist ───────────────────────────────────────────
if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist');

// ── Inject secrets into HTML files ───────────────────────────────
const HTML_FILES = [
  'gm-landing.html', 'gm-dtla-v1.html', 'map-test.html', 'dtla.html', 'dtla-template.html', 'laveen.html',
  'dashboard.html', 'grid-demo.html', 'mylocal.html', 'laveenlocal.html', 'place.html',
  'dtla-mall-map.html', 'laveen-mall-map.html',
  'lalife.html', 'desertlife.html',
  'cube-template.html',
  'i10.html',
  'cube-sample.html',
  'display.html',
  'display-qr-loop.html',
  'flyover.html',
];
HTML_FILES.forEach(f => {
  if (!fs.existsSync(f)) return;
  fs.writeFileSync(path.join('dist', f), inject(fs.readFileSync(f, 'utf8')));
  console.log('  ✓', f);
});

// ── Copy sub-page directories (lalife, desertlife, samples) — full directory ──
['lalife', 'desertlife', 'samples'].forEach(dir => {
  if (!fs.existsSync(dir)) return;
  fs.mkdirSync(path.join('dist', dir), { recursive: true });
  fs.readdirSync(dir).forEach(f => {
    const src = path.join(dir, f);
    const dst = path.join('dist', dir, f);
    if (f.endsWith('.html')) {
      fs.writeFileSync(dst, inject(fs.readFileSync(src, 'utf8')));
      console.log('  ✓', dir + '/' + f);
    } else {
      copyItem(src, dst);
    }
  });
});

// ── Copy redirect stubs ────────────────────────────────────────────
['dtla', 'laveen'].forEach(dir => {
  copyItem(path.join(dir, 'index.html'), path.join('dist', dir, 'index.html'));
});

// ── Copy static assets ────────────────────────────────────────────
['CNAME', 'sitemap.xml', 'robots.txt', 'googlecf81d1466488054d.html'].forEach(item => copyItem(item, path.join('dist', item)));
copyItem('assets', path.join('dist', 'assets'));

console.log('\n✅  Build complete → dist/');
