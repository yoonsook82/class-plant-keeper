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

async function checkRecordsTable() {
  const { data, error } = await supabase.from('records').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    if (data.length > 0) {
      console.log('Columns in records:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Table records is empty, but query succeeded.');
    }
  }
}

checkRecordsTable();
