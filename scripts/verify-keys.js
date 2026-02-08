const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('---------------------------------------------------');
console.log('ENVIRONMENT VARIABLE CHECK');
console.log('---------------------------------------------------');

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!anonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is MISSING in .env.local');
} else {
    console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY found.');
    console.log('   Starts with: ' + anonKey.substring(0, 20) + '...');
}

if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is MISSING in .env.local');
} else {
    console.log('✅ SUPABASE_SERVICE_ROLE_KEY found.');
    console.log('   Starts with: ' + serviceKey.substring(0, 20) + '...');
}

console.log('---------------------------------------------------');
console.log('Compare these with the keys in your Supabase Dashboard.');
console.log('If they match, your .env.local is correct.');
console.log('If they do NOT match, you saved the file incorrectly.');
