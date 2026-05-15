
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

async function listTables() {
  // Try to select from a few common names to see what exists
  const tablesToTest = ['plants', '식물', 'records', '기록', 'students', '재학생', 'classes', '수업'];
  console.log('--- Table Existence Check ---');
  
  for (const table of tablesToTest) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`✅ [${table}] exists.`);
      // Check columns if it's plants or 식물
      if (table === 'plants' || table === '식물') {
         const { data: cols, error: colErr } = await supabase.from(table).select('*').limit(1);
         if (cols && cols.length > 0) {
           console.log(`   Columns in ${table}: ${Object.keys(cols[0]).join(', ')}`);
         }
      }
    } else {
      console.log(`❌ [${table}] error: ${error.message}`);
    }
  }
}

listTables();
