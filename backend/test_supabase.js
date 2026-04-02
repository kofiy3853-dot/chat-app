const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('User')
    .select('avatar')
    .order('createdAt', { ascending: false })
    .limit(1);
    
  if (error) throw error;
  console.log(JSON.stringify(data[0], null, 2));
}

check().catch(console.error);
