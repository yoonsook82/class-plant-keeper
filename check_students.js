
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

async function checkStudents() {
  console.log('--- Students List ---');
  const { data, error } = await supabase.from('students').select('*');
  if (error) {
    console.error('Error fetching students:', error.message);
  } else {
    console.log(`Found ${data.length} students.`);
    console.log(data);
  }
}

checkStudents();
