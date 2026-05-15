const { createClient } = require('./node_modules/@supabase/supabase-js');
const fs = require('fs');

const envPath = './.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listInteractionsTable() {
  const { data, error } = await supabase.from('interactions').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Interactions table exists. Data:', data);
  }
}

listInteractionsTable();
