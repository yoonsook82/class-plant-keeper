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

async function checkClasses() {
  console.log('--- Classes Column Check ---');
  const { data, error } = await supabase.from('classes').select('*').limit(1);
  if (error) {
    console.error('Error fetching classes:', error.message);
    return;
  }
  if (data && data.length > 0) {
    console.log('Successfully fetched classes row. Columns found:');
    console.log(Object.keys(data[0]));
  } else {
    console.log('Classes table is empty, but query succeeded. No rows available.');
  }
}

checkClasses();
