const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Minimal quoted-CSV parser (handles Redfin's comma+quote style)
function parseCsvLine(line) {
  const fields = [];
  let i = 0, field = '';
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      while (i < line.length) {
        if (line[i] === '"' && line[i+1] === '"') { field += '"'; i += 2; }
        else if (line[i] === '"') { i++; break; }
        else { field += line[i++]; }
      }
      if (line[i] === ',') i++;
    } else {
      while (i < line.length && line[i] !== ',') field += line[i++];
      if (line[i] === ',') i++;
    }
    fields.push(field.trim());
    field = '';
  }
  return fields;
}

function parse(csvText) {
  const lines = csvText.split('\n').map(l => l.trimEnd()).filter(l => l);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mpmprnjhunjfeacikgml.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_KEY env var');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Find redfin_* CSVs in Downloads (try both vikpu and vikpuri)
const DOWNLOADS = [
  'C:/Users/vikpu/Downloads',
  'C:/Users/vikpuri/Downloads',
].find(d => fs.existsSync(d));

if (!DOWNLOADS) {
  console.error('Could not find Downloads folder');
  process.exit(1);
}

const csvFiles = fs.readdirSync(DOWNLOADS)
  .filter(f => f.startsWith('redfin_') && f.endsWith('.csv'))
  .map(f => path.join(DOWNLOADS, f));

if (csvFiles.length === 0) {
  console.error('No redfin_*.csv files found in', DOWNLOADS);
  process.exit(1);
}
console.log(`Found ${csvFiles.length} CSV file(s):\n  ${csvFiles.join('\n  ')}\n`);

function parseNum(val) {
  if (!val || val === '') return null;
  const n = parseFloat(String(val).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

function parseRows(file) {
  const raw = fs.readFileSync(file, 'utf8');
  // Redfin adds a disclaimer as the second line — strip non-CSV lines before the header
  const lines = raw.split('\n');
  // Keep only lines that look like data (header + rows starting with MLS/sale type values)
  const cleaned = lines.filter((l, i) => {
    if (i === 0) return true; // header
    const trimmed = l.trim();
    if (!trimmed) return false;
    // Skip the MLS disclaimer line
    if (trimmed.startsWith('"In accordance')) return false;
    if (trimmed.startsWith('In accordance')) return false;
    return true;
  }).join('\n');

  return parse(cleaned);
}

function toRow(r) {
  const urlCol = Object.keys(r).find(k => k.startsWith('URL'));
  const mlsCol = Object.keys(r).find(k => k === 'MLS#');
  return {
    name:        r['ADDRESS'] || null,
    address:     r['ADDRESS'] || null,
    city:        r['CITY'] || null,
    zip:         r['ZIP OR POSTAL CODE'] || null,
    neighborhood:r['LOCATION'] || null,
    price:       parseNum(r['PRICE']),
    beds:        parseNum(r['BEDS']),
    baths:       parseNum(r['BATHS']),
    sqft:        parseNum(r['SQUARE FEET']),
    lat:         parseNum(r['LATITUDE']),
    lng:         parseNum(r['LONGITUDE']),
    redfin_url:  urlCol ? r[urlCol] : null,
    class:       'RPOI',
    mls_status:  'active',
    _mls:        mlsCol ? r[mlsCol] : null, // for dedup only, not inserted
  };
}

async function run() {
  // Fetch existing redfin_urls and mls numbers to detect dupes
  const { data: existing } = await supabase
    .from('properties')
    .select('redfin_url')
    .eq('class', 'RPOI');

  const existingUrls = new Set((existing || []).map(r => r.redfin_url).filter(Boolean));

  // Collect all rows across files, dedup by MLS# then by URL
  const seenMls = new Set();
  const allRows = [];

  for (const file of csvFiles) {
    let rows;
    try { rows = parseRows(file); }
    catch (e) { console.error(`Failed to parse ${file}:`, e.message); continue; }

    for (const r of rows) {
      const row = toRow(r);
      if (!row.address) continue;
      if (!row.lat || !row.lng) continue;

      // Skip dupes by MLS#
      if (row._mls) {
        if (seenMls.has(row._mls)) { continue; }
        seenMls.add(row._mls);
      }
      // Skip dupes by URL already in DB
      if (row.redfin_url && existingUrls.has(row.redfin_url)) {
        console.log(`  skip (exists): ${row.address}`);
        continue;
      }

      const { _mls, ...insertRow } = row; // strip helper field
      allRows.push(insertRow);
    }
  }

  console.log(`Inserting ${allRows.length} listings...\n`);
  let inserted = 0, errors = 0;

  for (const row of allRows) {
    const { error } = await supabase.from('properties').insert(row);
    if (error) {
      console.error(`✗ ${row.address}: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ ${row.address}, ${row.city} ${row.zip}  $${row.price?.toLocaleString()}`);
      inserted++;
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${errors} errors, ${seenMls.size > 0 ? allRows.length - inserted - errors : 0} skipped.`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
