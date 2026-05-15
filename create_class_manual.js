const { createClient } = require('./node_modules/@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('./.env.local', 'utf8');
const getEnv = (key) => { const m = envContent.match(new RegExp(`${key}=(.*)`)); return m ? m[1].trim() : null; };
const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
async function main() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let classCode = '';
  for (let i = 0; i < 6; i++) {
    classCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const { data, error } = await supabase.from('classes').insert({
    class_name: '5학년 3반',
    teacher_email: 'yoon_gu@naver.com',
    teacher_password: 'dummy_password',
    class_code: classCode
  }).select();
  console.log('Inserted:', data, error);
}
main();
