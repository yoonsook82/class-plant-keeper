const { createClient } = require('./node_modules/@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('./.env.local', 'utf8');
const getEnv = (key) => { const m = envContent.match(new RegExp(`${key}=(.*)`)); return m ? m[1].trim() : null; };
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
async function main() {
  const { data } = await supabase.from('classes').select('*');
  console.log('Classes:', data);
}
main();
