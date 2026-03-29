const { createClient } = require('@supabase/supabase-js');

// These should be added to your .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Using service role key to bypass RLS for backend uploads

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Service Role Key missing. File uploads to Supabase will not work.');
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = supabase;
