const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(url, key);

async function test() {
  const email = 'test_signup_' + Date.now() + '@example.com';
  console.log('Signing up with', email);
  const { data: signupData, error: signupErr } = await supabase.auth.signUp({ email, password: 'Password123!' });
  if (signupErr) console.error('Signup error:', signupErr.message);
  else console.log('Signup success:', signupData.user?.email, 'Confirmed at:', signupData.user?.email_confirmed_at);
  
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password: 'Password123!' });
  if (loginErr) console.error('Login error:', loginErr.message);
  else console.log('Login success:', loginData.user?.email);
}
test();
