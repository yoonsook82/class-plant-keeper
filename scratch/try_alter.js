const { createClient } = require('@supabase/supabase-js');
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

async function tryAlterTable() {
  // This is a long shot, but let's see if we can use the rpc 'exec_sql' if it exists
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_id UUID;' });
  if (error) {
    console.error('RPC Error:', error.message);
  } else {
    console.log('Success?');
  }
}

tryAlterTable();
