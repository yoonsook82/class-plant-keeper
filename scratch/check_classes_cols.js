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

async function checkClassesTable() {
  const { data, error } = await supabase.from('classes').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    if (data.length > 0) {
      console.log('Columns in classes:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Table classes is empty, but query succeeded.');
    }
  }
}

checkClassesTable();
