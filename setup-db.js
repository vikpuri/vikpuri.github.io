const { execSync } = require('child_process');

// Install @supabase/supabase-js if not installed
try {
  require.resolve('@supabase/supabase-js');
  console.log('✓ @supabase/supabase-js already installed');
} catch (e) {
  console.log('Installing @supabase/supabase-js...');
  execSync('npm install @supabase/supabase-js', { stdio: 'inherit' });
}

const { createClient } = require('@supabase/supabase-js');

// NOTE: Use the service_role key (not publishable) to bypass RLS for inserts.
// Find it in Supabase dashboard → Project Settings → API → service_role secret.
const SUPABASE_URL = 'https://mpmprnjhunjfeacikgml.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_publishable_T6XISHd9O2Ol0raPaEASqQ_klUXnyY3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { count } = await supabase.from('properties').select('*', { count: 'exact', head: true });
  console.log('Total properties in Supabase:', count);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
