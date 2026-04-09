/**
 * living-migrate.js
 * Run this SQL in the Supabase SQL Editor at:
 * https://supabase.com/dashboard/project/mpmprnjhunjfeacikgml/sql
 *
 * Step 1 — Rename restaurants → living and add new columns
 * Step 2 — Backfill market column for existing CA records
 * Step 3 — Add unique constraint for upsert (name + zip + category)
 */

const MIGRATION_SQL = `
-- Step 1: Rename table
ALTER TABLE restaurants RENAME TO living;

-- Step 2: Add new columns
ALTER TABLE living
  ADD COLUMN IF NOT EXISTS market      TEXT DEFAULT 'CA',
  ADD COLUMN IF NOT EXISTS chain       TEXT,
  ADD COLUMN IF NOT EXISTS redfin_url  TEXT,
  ADD COLUMN IF NOT EXISTS category    TEXT;

-- Step 3: Backfill market for existing CA records
UPDATE living SET market = 'CA'
WHERE zip IN ('90017','90015','90013','90014','90069','90046','90210',
              '90211','90024','90025','90402','90403','90049','90292','90067');

-- Step 4: Backfill market for AZ records (if any exist)
UPDATE living SET market = 'AZ'
WHERE zip IN ('85339','85041','85042','85044','85223');

-- Step 5: Add unique constraint to support upsert
ALTER TABLE living
  DROP CONSTRAINT IF EXISTS living_name_zip_category_key;
ALTER TABLE living
  ADD CONSTRAINT living_name_zip_category_key UNIQUE (name, zip, category);

-- Step 6: Add index for fast market + category queries
CREATE INDEX IF NOT EXISTS idx_living_market ON living(market);
CREATE INDEX IF NOT EXISTS idx_living_category ON living(category);
CREATE INDEX IF NOT EXISTS idx_living_zip ON living(zip);

-- Verify
SELECT market, category, COUNT(*) as count
FROM living
GROUP BY market, category
ORDER BY market, count DESC;
`;

console.log('=== COPY AND PASTE THE SQL BELOW INTO SUPABASE SQL EDITOR ===\n');
console.log(MIGRATION_SQL);
console.log('\n=== After running SQL, populate data with: ===');
console.log('SUPABASE_SERVICE_KEY=your_key node fetch-yelp-by-zip.js');
