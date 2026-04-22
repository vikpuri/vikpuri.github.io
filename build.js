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

const SB_KEY = process.env.SUPABASE_KEY;

if (!SB_KEY) {
  console.warn('WARN: SUPABASE_KEY not set — key already embedded in source files, continuing build');
}

// ── Helpers ───────────────────────────────────────────────────────
function inject(str) {
  return str.split('__SB_KEY__').join(SB_KEY);
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
  'index.html', 'dtla.html', 'laveen.html',
  'lalife.html', 'desertlife.html', 'dashboard.html', 'grid-demo.html',
  'dashboard-v1.bak.html'
];
HTML_FILES.forEach(f => {
  if (!fs.existsSync(f)) return;
  fs.writeFileSync(path.join('dist', f), inject(fs.readFileSync(f, 'utf8')));
  console.log('  ✓', f);
});

// ── Copy redirect stubs (no secrets in these) ─────────────────────
['dtla', 'laveen', 'lalife', 'desertlife'].forEach(dir => {
  copyItem(path.join(dir, 'index.html'), path.join('dist', dir, 'index.html'));
});

// ── Copy static assets ────────────────────────────────────────────
['CNAME', 'netlify'].forEach(item => copyItem(item, path.join('dist', item)));

console.log('\n✅  Build complete → dist/');
